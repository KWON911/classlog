const CLASSLOG_IMPORT_ENDPOINT = 'https://classlog-ten.vercel.app/api/google-form-record-import'
const STUDENT_NAME_QUESTION = '이름'
const TEACHER_RECORD_QUESTION = '교사기록'
const KOREA_TIME_ZONE = 'Asia/Seoul'

/** Form 편집 화면의 Apps Script에 붙여넣은 뒤 한 번 실행해 설치형 제출 트리거를 만든다. */
function installFormSubmitTrigger() {
  const form = FormApp.getActiveForm()
  const exists = ScriptApp.getUserTriggers(form).some((trigger) => (
    trigger.getHandlerFunction() === 'handleFormSubmit'
    && trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
  ))

  if (!exists) {
    ScriptApp.newTrigger('handleFormSubmit').forForm(form).onFormSubmit().create()
  }
}

/** 설치형 Form 제출 트리거의 핸들러다. */
function handleFormSubmit(event) {
  return importFormResponse(event.response)
}

/** 과거 응답을 다시 실행해도 응답 ID 기준으로 중복 저장되지 않는다. */
function backfillExistingResponses() {
  const responses = FormApp.getActiveForm().getResponses()
  let imported = 0
  let skipped = 0

  responses.forEach((response) => {
    const result = importFormResponse(response)
    if (result.status === 'skipped') skipped += 1
    else imported += 1
  })

  Logger.log(`처리 완료: 전송 ${imported}건, 건너뜀 ${skipped}건`)
}

function importFormResponse(response) {
  const values = extractResponseValues(response)
  if (values.studentNames.length === 0 || !values.content) {
    return { status: 'skipped' }
  }

  const secret = PropertiesService.getScriptProperties().getProperty('GOOGLE_FORM_RECORD_IMPORT_SECRET')
  if (!secret) {
    throw new Error('Script Properties에 GOOGLE_FORM_RECORD_IMPORT_SECRET를 설정하세요.')
  }

  const payload = {
    responseId: response.getId(),
    studentNames: values.studentNames,
    content: values.content,
    recordDate: Utilities.formatDate(response.getTimestamp(), KOREA_TIME_ZONE, 'yyyy-MM-dd'),
  }
  const httpResponse = UrlFetchApp.fetch(CLASSLOG_IMPORT_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${secret}` },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  })
  const statusCode = httpResponse.getResponseCode()
  const body = httpResponse.getContentText()

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Classlog 가져오기 실패 (${statusCode}): ${body}`)
  }
  return JSON.parse(body).result
}

function extractResponseValues(response) {
  let studentNames = []
  let content = ''

  response.getItemResponses().forEach((itemResponse) => {
    const title = itemResponse.getItem().getTitle()
    const value = itemResponse.getResponse()

    if (title === STUDENT_NAME_QUESTION) {
      studentNames = Array.isArray(value) ? value : [value]
    }
    if (title === TEACHER_RECORD_QUESTION) {
      content = String(value || '').trim()
    }
  })

  return {
    studentNames: studentNames.map((name) => String(name).trim()).filter(Boolean),
    content,
  }
}
