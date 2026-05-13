const axios   = require('axios');
const cheerio = require('cheerio');
const cookie  = require('cookie');
require('dotenv').config();

class ClasseViva {

  static endpoints = {
    auth:       'https://web.spaggiari.eu/auth-p7/app/default/AuthApi4.php?a=aLoginPwd',
    marks:      'https://web.spaggiari.eu/cvv/app/default/genitori_note.php?filtro=tutto',
    notes:      'https://web.spaggiari.eu/fml/app/default/gioprof_note_studente.php',
    today:      'https://web.spaggiari.eu/cvv/app/default/regclasse.php',
    profile:    'https://web.spaggiari.eu/acc/app/default/me.php?v=me',
    assignment: 'https://web.spaggiari.eu/fml/app/default/didattica_genitori_new.php',
    absences:   'https://web.spaggiari.eu/cvv/app/default/genitori_assenze.php',
    timetable:  'https://web.spaggiari.eu/cvv/app/default/genitori_orario.php',
    agenda:     'https://web.spaggiari.eu/fml/app/default/agenda_studenti.php',
  };

  constructor(userId, userPassword) {
    this.userId       = userId;
    this.userPassword = userPassword;
    this.sessionid    = null;
  }

  async login() {
    const response = await axios.post(
      ClasseViva.endpoints.auth,
      new URLSearchParams({ uid: this.userId, pwd: this.userPassword, cid: '', pin: '', target: '' }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, responseType: 'json' }
    );

    const data = response.data;
    if (data.error && data.error.length > 0) throw new Error('Credenziali errate');

    const rawCookies = response.headers['set-cookie'] ?? [];
    const sessRaw    = rawCookies.find(c => c.includes('PHPSESSID'));
    if (!sessRaw) throw new Error('Sessione non ricevuta');

    this.sessionid = cookie.parse(sessRaw).PHPSESSID;
    return this;
  }

  static async establishSession(userId, userPassword) {
    const instance = new ClasseViva(userId, userPassword);
    await instance.login();
    return instance;
  }

  // ─────────────────────────────────────────────
  //  PROFILO
  // ─────────────────────────────────────────────

  async getProfile() {
    const response = await this.request({ url: ClasseViva.endpoints.profile });
    const $ = cheerio.load(response.data);

    const schoolName = $('#top_page_name_div div:first-child .open_sans_condensed.font_size_14.graytext')
      .clone().children().remove().end().text().trim();

    return {
      name:       $('#top_page_name_div div:first-child .open_sans_extrabold.font_size_28.graytext').text().trim(),
      uid:        $('#top_page_name_div div:first-child .open_sans_extrabold.font_size_12.graytext').text().trim(),
      pic:        'https://web.spaggiari.eu/img/' + $('.top_div_foto').children(':first-child').attr('src')?.split('img/')[1],
      schoolName,
    };
  }

  // ─────────────────────────────────────────────
  //  VOTI
  // ─────────────────────────────────────────────

  async getGrades() {
    const response = await this.request({ url: ClasseViva.endpoints.marks });
    const $ = cheerio.load(response.data);
    const grades = [];

    $('.registro').each((_, row) => {
      const subject = $(row).text().trim();
      $(row).parent().nextUntil('tr[align=center]').each((_, mark) => {
        grades.push({
          subject,
          mark:        $(mark).find('.s_reg_testo').text().trim(),
          type:        $(mark).find('.voto_data').last().text().trim(),
          description: $(mark).find('[colspan=32]').find('span').text().trim(),
          date:        $(mark).find('.voto_data').first().text().trim(),
        });
      });
    });

    return grades;
  }

  // ─────────────────────────────────────────────
  //  NOTE DISCIPLINARI
  // ─────────────────────────────────────────────

  async getNotes() {
    const response = await this.request({ url: ClasseViva.endpoints.notes });
    const $ = cheerio.load(response.data);
    const notes = [];

    $('#sort_table tbody tr').each((_, note) => {
      notes.push({
        teacher: $(note).children(':first-child').text().trim(),
        date:    $(note).children(':nth-child(2)').text().trim(),
        content: $(note).children(':nth-child(3)').text().trim(),
        type:    $(note).children(':last-child').text().trim(),
      });
    });

    return notes;
  }

  // ─────────────────────────────────────────────
  //  ASSENZE
  // ─────────────────────────────────────────────

  async getAbsences() {
    const response = await this.request({ url: ClasseViva.endpoints.absences });
    const $ = cheerio.load(response.data);
    const absences = [];

    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const type = cells.eq(0).text().trim();
      if (!type) return;

      absences.push({
        type,
        date:      cells.eq(1).text().trim(),
        justified: cells.eq(2).text().trim(),
        notes:     cells.eq(3)?.text().trim() ?? '',
      });
    });

    return absences;
  }

  // ─────────────────────────────────────────────
  //  RITARDI  (filtro su assenze)
  // ─────────────────────────────────────────────

  async getDelays() {
    const all = await this.getAbsences();
    return all.filter(a => /ritardo/i.test(a.type));
  }

  // ─────────────────────────────────────────────
  //  ARGOMENTI LEZIONE
  // ─────────────────────────────────────────────

  async getLessons(dateTime) {
    const { subjects } = await this.getToday(dateTime);
    return subjects;
  }

  // ─────────────────────────────────────────────
  //  COMPITI
  // ─────────────────────────────────────────────

  async getHomework() {
    let response = await this.request({ url: ClasseViva.endpoints.assignment });
    let $ = cheerio.load(response.data);

    const assignments  = [];
    const pageCountRaw = $('#data_table tbody tr:last-child td:nth-child(5) strong').text().trim();
    const pageCount    = parseInt(pageCountRaw.split('/')[1]) || 1;

    for (let i = 1; i <= pageCount; i++) {
      response = await this.request({ url: ClasseViva.endpoints.assignment + `?p=${i}` });
      $ = cheerio.load(response.data);

      $('.row.contenuto').each((_, line) => {
        assignments.push({
          teacherName:     $(line).find(':nth-child(2) div').text().trim(),
          assignmentTitle: $(line).find(':nth-child(4) div span:nth-child(1)').text().trim(),
          date:            $(line).find(':nth-child(6) div').text().trim(),
        });
      });
    }

    return assignments;
  }

  // ─────────────────────────────────────────────
  //  ORARIO
  // ─────────────────────────────────────────────

  async getTimetable() {
    const response = await this.request({ url: ClasseViva.endpoints.timetable });
    const $ = cheerio.load(response.data);
    const timetable = [];

    $('table tbody tr').each((rowIdx, row) => {
      $(row).find('td').each((colIdx, cell) => {
        const text = $(cell).text().trim();
        if (text) timetable.push({ row: rowIdx, col: colIdx, content: text });
      });
    });

    return timetable;
  }

  // ─────────────────────────────────────────────
  //  REGISTRO GIORNALIERO  (interno)
  // ─────────────────────────────────────────────

  async getToday(dateTime) {
    let url = ClasseViva.endpoints.today;

    if (dateTime !== undefined) {
      const date  = new Date(dateTime);
      const day   = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year  = date.getFullYear();
      url += `?data_start=${year}-${month}-${day}`;
    }

    const response = await this.request({ url });
    const $ = cheerio.load(response.data);

    const presences = [];
    $('.registro.rigtab.firma_stato div.whitetext').each((_, row) => {
      if (!$(row).hasClass('cella_registro') && $(row).text().trim()) {
        presences.push({ status: $(row).text().trim(), length: $(row).attr('xt:nh') });
      }
    });

    const subjects = [];
    $('tbody .rigtab[align=center]').each((_, line) => {
      if ($(line).attr('id') === undefined && $(line).children().length > 1) {
        subjects.push({
          teacherName:    $(line).find('.registro_firma_dett_docente').text().trim(),
          lessonType:     $(line).find('.registro_firma_dett_argomento_lezione b').text().trim(),
          lessonArgument: $(line).find('.registro_firma_dett_argomento_lezione .registro_firma_dett_argomento_nota').text().trim(),
          subject:        $(line).find('.registro_firma_dett_materia').children(':first-child').text().trim(),
          hour:           $(line).find('.registro_firma_dett_ora').text().trim().split('^')[0],
          hoursDone:      $(line).find('.registro_firma_dett_ora').text().trim().split('^')[1]?.replace(/[()]/g, '') ?? '',
        });
      }
    });

    return { presences, subjects };
  }

  // ─────────────────────────────────────────────
  //  HELPER HTTP
  // ─────────────────────────────────────────────

  request(config) {
    config.headers = config.headers ?? {};
    config.headers['Cookie'] = cookie.serialize('PHPSESSID', this.sessionid);
    return axios.request(config);
  }
}

module.exports = ClasseViva;