import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.login': { paramsTuple?: []; params?: {} }
    'auth.password_reset.forgot': { paramsTuple?: []; params?: {} }
    'auth.password_reset.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'auth.password_reset.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'profile.profile.update_password': { paramsTuple?: []; params?: {} }
    'profile.profile.update_organization': { paramsTuple?: []; params?: {} }
    'profile.sessions.destroy': { paramsTuple?: []; params?: {} }
    'billing.plans': { paramsTuple?: []; params?: {} }
    'billing_webhook': { paramsTuple?: []; params?: {} }
    'billing.subscription': { paramsTuple?: []; params?: {} }
    'billing.payments': { paramsTuple?: []; params?: {} }
    'billing.show_payment': { paramsTuple: [ParamValue]; params: {'reference': ParamValue} }
    'billing.export_applications': { paramsTuple?: []; params?: {} }
    'billing.checkout': { paramsTuple?: []; params?: {} }
    'billing.confirm': { paramsTuple?: []; params?: {} }
    'career.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'career.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.apply': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.verify': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.resend_otp': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.show_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
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
    'talent_pool.index': { paramsTuple?: []; params?: {} }
    'talent_pool.tags': { paramsTuple?: []; params?: {} }
    'talent_pool.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'talent_pool.store': { paramsTuple?: []; params?: {} }
    'talent_pool.store_from_application': { paramsTuple?: []; params?: {} }
    'talent_pool.create_tag': { paramsTuple?: []; params?: {} }
    'talent_pool.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.add_note': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.update_note': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'talent_pool.destroy_note': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'talent_pool.set_tags': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.attach_to_job': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'job_evaluation_criteria.sources': { paramsTuple?: []; params?: {} }
    'job_evaluation_criteria.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_evaluation_criteria.save': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_evaluation_criteria.duplicate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'evaluations.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'evaluations.upsert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'evaluations.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'evaluationId': ParamValue} }
    'application_notes.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'application_notes.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'application_notes.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'application_notes.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.store': { paramsTuple?: []; params?: {} }
    'job_forms.sources': { paramsTuple?: []; params?: {} }
    'job_forms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_forms.save_draft': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_forms.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_forms.duplicate_draft': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_forms.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'auth.password_reset.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'billing.plans': { paramsTuple?: []; params?: {} }
    'billing.subscription': { paramsTuple?: []; params?: {} }
    'billing.payments': { paramsTuple?: []; params?: {} }
    'billing.show_payment': { paramsTuple: [ParamValue]; params: {'reference': ParamValue} }
    'billing.export_applications': { paramsTuple?: []; params?: {} }
    'career.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'career.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.show_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
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
    'talent_pool.index': { paramsTuple?: []; params?: {} }
    'talent_pool.tags': { paramsTuple?: []; params?: {} }
    'talent_pool.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'information_requests.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.download_document': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue,'documentId': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'job_evaluation_criteria.sources': { paramsTuple?: []; params?: {} }
    'job_evaluation_criteria.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'evaluations.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'application_notes.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'job_forms.sources': { paramsTuple?: []; params?: {} }
    'job_forms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'auth.password_reset.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'billing.plans': { paramsTuple?: []; params?: {} }
    'billing.subscription': { paramsTuple?: []; params?: {} }
    'billing.payments': { paramsTuple?: []; params?: {} }
    'billing.show_payment': { paramsTuple: [ParamValue]; params: {'reference': ParamValue} }
    'billing.export_applications': { paramsTuple?: []; params?: {} }
    'career.index': { paramsTuple: [ParamValue]; params: {'orgSlug': ParamValue} }
    'career.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.show_slot_request': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'career.show_invitation': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
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
    'talent_pool.index': { paramsTuple?: []; params?: {} }
    'talent_pool.tags': { paramsTuple?: []; params?: {} }
    'talent_pool.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'applications.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.download_document': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'documentId': ParamValue} }
    'information_requests.list': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.download_document': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue,'documentId': ParamValue} }
    'interviews.index_for_application': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.index_all': { paramsTuple?: []; params?: {} }
    'job_evaluation_criteria.sources': { paramsTuple?: []; params?: {} }
    'job_evaluation_criteria.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'evaluations.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'application_notes.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'job_forms.sources': { paramsTuple?: []; params?: {} }
    'job_forms.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.login': { paramsTuple?: []; params?: {} }
    'auth.password_reset.forgot': { paramsTuple?: []; params?: {} }
    'auth.password_reset.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'profile.sessions.destroy': { paramsTuple?: []; params?: {} }
    'billing_webhook': { paramsTuple?: []; params?: {} }
    'billing.checkout': { paramsTuple?: []; params?: {} }
    'billing.confirm': { paramsTuple?: []; params?: {} }
    'career.apply': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.verify': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
    'career.resend_otp': { paramsTuple: [ParamValue,ParamValue]; params: {'orgSlug': ParamValue,'jobSlug': ParamValue} }
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
    'talent_pool.store': { paramsTuple?: []; params?: {} }
    'talent_pool.store_from_application': { paramsTuple?: []; params?: {} }
    'talent_pool.create_tag': { paramsTuple?: []; params?: {} }
    'talent_pool.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.add_note': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.attach_to_job': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.create': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'information_requests.resend': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'information_requests.cancel': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'requestId': ParamValue} }
    'interviews.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.request_slots': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_evaluation_criteria.duplicate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'application_notes.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.store': { paramsTuple?: []; params?: {} }
    'job_forms.publish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_forms.duplicate_draft': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'profile.profile.update': { paramsTuple?: []; params?: {} }
    'profile.profile.update_password': { paramsTuple?: []; params?: {} }
    'profile.profile.update_organization': { paramsTuple?: []; params?: {} }
    'talent_pool.update_note': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'talent_pool.set_tags': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'applications.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interviews.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_evaluation_criteria.save': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'evaluations.upsert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'application_notes.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'job_forms.save_draft': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'talent_pool.destroy_note': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'talent_pool.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'talent_pool.purge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'evaluations.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'evaluationId': ParamValue} }
    'application_notes.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'noteId': ParamValue} }
    'job_forms.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}