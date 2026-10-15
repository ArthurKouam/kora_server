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
    'career.resend_otp': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.verify': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.submit_slots': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.respond_to_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'information_requests.public_show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'information_requests.public_submit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.public_show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept_legacy': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.public_show_alias': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept_alias': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept_legacy_alias': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'reports.index': { paramsTuple?: []; params?: {} }
    'team_invitations.members': { paramsTuple?: []; params?: {} }
    'team_invitations.index': { paramsTuple?: []; params?: {} }
    'team_invitations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team_invitations.store': { paramsTuple?: []; params?: {} }
    'team_invitations.resend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team_invitations.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'candidates.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'applications.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.resend': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.cancel': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.download_document': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue,'documentId': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.request_slots': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'interviews.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.store': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forms.index': { paramsTuple?: []; params?: {} }
    'forms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forms.store': { paramsTuple?: []; params?: {} }
    'forms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forms.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'career.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'information_requests.public_show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.public_show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.public_show_alias': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'reports.index': { paramsTuple?: []; params?: {} }
    'team_invitations.members': { paramsTuple?: []; params?: {} }
    'team_invitations.index': { paramsTuple?: []; params?: {} }
    'team_invitations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'candidates.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'information_requests.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.download_document': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue,'documentId': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forms.index': { paramsTuple?: []; params?: {} }
    'forms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'career.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'information_requests.public_show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.public_show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.public_show_alias': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'reports.index': { paramsTuple?: []; params?: {} }
    'team_invitations.members': { paramsTuple?: []; params?: {} }
    'team_invitations.index': { paramsTuple?: []; params?: {} }
    'team_invitations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'candidates.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'information_requests.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.download_document': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue,'documentId': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forms.index': { paramsTuple?: []; params?: {} }
    'forms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.login': { paramsTuple?: []; params?: {} }
    'profile.sessions.destroy': { paramsTuple?: []; params?: {} }
    'career.apply': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.resend_otp': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.verify': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'career.submit_slots': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.respond_to_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'information_requests.public_submit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept_legacy': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept_alias': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.accept_legacy_alias': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'team_invitations.store': { paramsTuple?: []; params?: {} }
    'team_invitations.resend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team_invitations.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.resend': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.cancel': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'interviews.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.request_slots': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.store': { paramsTuple?: []; params?: {} }
    'forms.store': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'profile.profile.update_password': { paramsTuple?: []; params?: {} }
    'profile.profile.update_organization': { paramsTuple?: []; params?: {} }
    'applications.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'forms.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}