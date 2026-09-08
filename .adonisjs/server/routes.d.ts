import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.login': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'profile.profile.update_password': { paramsTuple?: []; params?: {} }
    'profile.profile.update_organization': { paramsTuple?: []; params?: {} }
    'profile.sessions.destroy': { paramsTuple?: []; params?: {} }
    'career.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.apply': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.verify': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'pendingId': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.submit_slots': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.respond_to_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'reports.index': { paramsTuple?: []; params?: {} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'candidates.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'applications.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.request_slots': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'interviews.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.store': { paramsTuple?: []; params?: {} }
    'job_forms.show': { paramsTuple?: []; params?: {} }
    'job_forms.save_draft': { paramsTuple?: []; params?: {} }
    'job_forms.publish': { paramsTuple?: []; params?: {} }
    'job_forms.destroy': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'career.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'reports.index': { paramsTuple?: []; params?: {} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'candidates.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'job_forms.show': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'career.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'reports.index': { paramsTuple?: []; params?: {} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'candidates.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'job_forms.show': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.login': { paramsTuple?: []; params?: {} }
    'profile.sessions.destroy': { paramsTuple?: []; params?: {} }
    'career.apply': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.verify': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'pendingId': ParamValue} }
    'career.submit_slots': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.respond_to_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'interviews.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.request_slots': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.store': { paramsTuple?: []; params?: {} }
    'job_forms.publish': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'profile.profile.update_password': { paramsTuple?: []; params?: {} }
    'profile.profile.update_organization': { paramsTuple?: []; params?: {} }
    'applications.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_forms.save_draft': { paramsTuple?: []; params?: {} }
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'job_forms.destroy': { paramsTuple?: []; params?: {} }
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}