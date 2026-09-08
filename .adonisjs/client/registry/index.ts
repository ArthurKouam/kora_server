/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'drive.fs.serve': {
    methods: ["GET","HEAD"],
    pattern: '/uploads/*',
    tokens: [{"old":"/uploads/*","type":0,"val":"uploads","end":""},{"old":"/uploads/*","type":2,"val":"*","end":""}],
    types: placeholder as Registry['drive.fs.serve']['types'],
  },
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.sessions.login': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.sessions.login']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.profile.update': {
    methods: ["PUT"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.update']['types'],
  },
  'profile.profile.update_password': {
    methods: ["PUT"],
    pattern: '/api/v1/account/password',
    tokens: [{"old":"/api/v1/account/password","type":0,"val":"api","end":""},{"old":"/api/v1/account/password","type":0,"val":"v1","end":""},{"old":"/api/v1/account/password","type":0,"val":"account","end":""},{"old":"/api/v1/account/password","type":0,"val":"password","end":""}],
    types: placeholder as Registry['profile.profile.update_password']['types'],
  },
  'profile.profile.update_organization': {
    methods: ["PUT"],
    pattern: '/api/v1/account/organization',
    tokens: [{"old":"/api/v1/account/organization","type":0,"val":"api","end":""},{"old":"/api/v1/account/organization","type":0,"val":"v1","end":""},{"old":"/api/v1/account/organization","type":0,"val":"account","end":""},{"old":"/api/v1/account/organization","type":0,"val":"organization","end":""}],
    types: placeholder as Registry['profile.profile.update_organization']['types'],
  },
  'profile.sessions.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.sessions.destroy']['types'],
  },
  'career.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/career/jobs/:slug',
    tokens: [{"old":"/api/v1/career/jobs/:slug","type":0,"val":"api","end":""},{"old":"/api/v1/career/jobs/:slug","type":0,"val":"v1","end":""},{"old":"/api/v1/career/jobs/:slug","type":0,"val":"career","end":""},{"old":"/api/v1/career/jobs/:slug","type":0,"val":"jobs","end":""},{"old":"/api/v1/career/jobs/:slug","type":1,"val":"slug","end":""}],
    types: placeholder as Registry['career.show']['types'],
  },
  'career.apply': {
    methods: ["POST"],
    pattern: '/api/v1/career/jobs/:slug/apply',
    tokens: [{"old":"/api/v1/career/jobs/:slug/apply","type":0,"val":"api","end":""},{"old":"/api/v1/career/jobs/:slug/apply","type":0,"val":"v1","end":""},{"old":"/api/v1/career/jobs/:slug/apply","type":0,"val":"career","end":""},{"old":"/api/v1/career/jobs/:slug/apply","type":0,"val":"jobs","end":""},{"old":"/api/v1/career/jobs/:slug/apply","type":1,"val":"slug","end":""},{"old":"/api/v1/career/jobs/:slug/apply","type":0,"val":"apply","end":""}],
    types: placeholder as Registry['career.apply']['types'],
  },
  'career.verify': {
    methods: ["POST"],
    pattern: '/api/v1/career/jobs/:slug/apply/:pendingId/verify',
    tokens: [{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":0,"val":"api","end":""},{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":0,"val":"v1","end":""},{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":0,"val":"career","end":""},{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":0,"val":"jobs","end":""},{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":1,"val":"slug","end":""},{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":0,"val":"apply","end":""},{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":1,"val":"pendingId","end":""},{"old":"/api/v1/career/jobs/:slug/apply/:pendingId/verify","type":0,"val":"verify","end":""}],
    types: placeholder as Registry['career.verify']['types'],
  },
  'career.show_slot_request': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/career/interview-slots/:token',
    tokens: [{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"api","end":""},{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"v1","end":""},{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"career","end":""},{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"interview-slots","end":""},{"old":"/api/v1/career/interview-slots/:token","type":1,"val":"token","end":""}],
    types: placeholder as Registry['career.show_slot_request']['types'],
  },
  'career.submit_slots': {
    methods: ["POST"],
    pattern: '/api/v1/career/interview-slots/:token',
    tokens: [{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"api","end":""},{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"v1","end":""},{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"career","end":""},{"old":"/api/v1/career/interview-slots/:token","type":0,"val":"interview-slots","end":""},{"old":"/api/v1/career/interview-slots/:token","type":1,"val":"token","end":""}],
    types: placeholder as Registry['career.submit_slots']['types'],
  },
  'career.respond_to_invitation': {
    methods: ["POST"],
    pattern: '/api/v1/career/interview-confirmations/:token',
    tokens: [{"old":"/api/v1/career/interview-confirmations/:token","type":0,"val":"api","end":""},{"old":"/api/v1/career/interview-confirmations/:token","type":0,"val":"v1","end":""},{"old":"/api/v1/career/interview-confirmations/:token","type":0,"val":"career","end":""},{"old":"/api/v1/career/interview-confirmations/:token","type":0,"val":"interview-confirmations","end":""},{"old":"/api/v1/career/interview-confirmations/:token","type":1,"val":"token","end":""}],
    types: placeholder as Registry['career.respond_to_invitation']['types'],
  },
  'dashboard.stats': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/stats',
    tokens: [{"old":"/api/v1/dashboard/stats","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/stats","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/stats","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/stats","type":0,"val":"stats","end":""}],
    types: placeholder as Registry['dashboard.stats']['types'],
  },
  'dashboard.upcoming_interviews': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/upcoming-interviews',
    tokens: [{"old":"/api/v1/dashboard/upcoming-interviews","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/upcoming-interviews","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/upcoming-interviews","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/upcoming-interviews","type":0,"val":"upcoming-interviews","end":""}],
    types: placeholder as Registry['dashboard.upcoming_interviews']['types'],
  },
  'dashboard.application_status_stats': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/application-status-stats',
    tokens: [{"old":"/api/v1/dashboard/application-status-stats","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/application-status-stats","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/application-status-stats","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/application-status-stats","type":0,"val":"application-status-stats","end":""}],
    types: placeholder as Registry['dashboard.application_status_stats']['types'],
  },
  'dashboard.job_status_stats': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/job-status-stats',
    tokens: [{"old":"/api/v1/dashboard/job-status-stats","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/job-status-stats","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/job-status-stats","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/job-status-stats","type":0,"val":"job-status-stats","end":""}],
    types: placeholder as Registry['dashboard.job_status_stats']['types'],
  },
  'reports.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/reports',
    tokens: [{"old":"/api/v1/dashboard/reports","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/reports","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/reports","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/reports","type":0,"val":"reports","end":""}],
    types: placeholder as Registry['reports.index']['types'],
  },
  'candidates.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/candidates',
    tokens: [{"old":"/api/v1/dashboard/candidates","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/candidates","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/candidates","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/candidates","type":0,"val":"candidates","end":""}],
    types: placeholder as Registry['candidates.index']['types'],
  },
  'candidates.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/candidates/:id',
    tokens: [{"old":"/api/v1/dashboard/candidates/:id","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/candidates/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/candidates/:id","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/candidates/:id","type":0,"val":"candidates","end":""},{"old":"/api/v1/dashboard/candidates/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['candidates.show']['types'],
  },
  'applications.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/applications/:id',
    tokens: [{"old":"/api/v1/dashboard/applications/:id","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/applications/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/applications/:id","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/applications/:id","type":0,"val":"applications","end":""},{"old":"/api/v1/dashboard/applications/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['applications.show']['types'],
  },
  'applications.download_document': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/applications/:id/documents/:documentId',
    tokens: [{"old":"/api/v1/dashboard/applications/:id/documents/:documentId","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/applications/:id/documents/:documentId","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/applications/:id/documents/:documentId","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/applications/:id/documents/:documentId","type":0,"val":"applications","end":""},{"old":"/api/v1/dashboard/applications/:id/documents/:documentId","type":1,"val":"id","end":""},{"old":"/api/v1/dashboard/applications/:id/documents/:documentId","type":0,"val":"documents","end":""},{"old":"/api/v1/dashboard/applications/:id/documents/:documentId","type":1,"val":"documentId","end":""}],
    types: placeholder as Registry['applications.download_document']['types'],
  },
  'applications.update_status': {
    methods: ["PUT"],
    pattern: '/api/v1/dashboard/applications/:id/status',
    tokens: [{"old":"/api/v1/dashboard/applications/:id/status","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/applications/:id/status","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/applications/:id/status","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/applications/:id/status","type":0,"val":"applications","end":""},{"old":"/api/v1/dashboard/applications/:id/status","type":1,"val":"id","end":""},{"old":"/api/v1/dashboard/applications/:id/status","type":0,"val":"status","end":""}],
    types: placeholder as Registry['applications.update_status']['types'],
  },
  'interviews.index_for_application': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/applications/:id/interviews',
    tokens: [{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"applications","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":1,"val":"id","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"interviews","end":""}],
    types: placeholder as Registry['interviews.index_for_application']['types'],
  },
  'interviews.store': {
    methods: ["POST"],
    pattern: '/api/v1/dashboard/applications/:id/interviews',
    tokens: [{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"applications","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":1,"val":"id","end":""},{"old":"/api/v1/dashboard/applications/:id/interviews","type":0,"val":"interviews","end":""}],
    types: placeholder as Registry['interviews.store']['types'],
  },
  'interviews.request_slots': {
    methods: ["POST"],
    pattern: '/api/v1/dashboard/applications/:id/slot-requests',
    tokens: [{"old":"/api/v1/dashboard/applications/:id/slot-requests","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/applications/:id/slot-requests","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/applications/:id/slot-requests","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/applications/:id/slot-requests","type":0,"val":"applications","end":""},{"old":"/api/v1/dashboard/applications/:id/slot-requests","type":1,"val":"id","end":""},{"old":"/api/v1/dashboard/applications/:id/slot-requests","type":0,"val":"slot-requests","end":""}],
    types: placeholder as Registry['interviews.request_slots']['types'],
  },
  'interviews.index_all': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/interviews',
    tokens: [{"old":"/api/v1/dashboard/interviews","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/interviews","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/interviews","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/interviews","type":0,"val":"interviews","end":""}],
    types: placeholder as Registry['interviews.index_all']['types'],
  },
  'interviews.update': {
    methods: ["PUT"],
    pattern: '/api/v1/dashboard/interviews/:id',
    tokens: [{"old":"/api/v1/dashboard/interviews/:id","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/interviews/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/interviews/:id","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/interviews/:id","type":0,"val":"interviews","end":""},{"old":"/api/v1/dashboard/interviews/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['interviews.update']['types'],
  },
  'jobs.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/jobs',
    tokens: [{"old":"/api/v1/dashboard/jobs","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs","type":0,"val":"jobs","end":""}],
    types: placeholder as Registry['jobs.index']['types'],
  },
  'jobs.store': {
    methods: ["POST"],
    pattern: '/api/v1/dashboard/jobs',
    tokens: [{"old":"/api/v1/dashboard/jobs","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs","type":0,"val":"jobs","end":""}],
    types: placeholder as Registry['jobs.store']['types'],
  },
  'job_forms.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/jobs/form',
    tokens: [{"old":"/api/v1/dashboard/jobs/form","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs/form","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs/form","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs/form","type":0,"val":"jobs","end":""},{"old":"/api/v1/dashboard/jobs/form","type":0,"val":"form","end":""}],
    types: placeholder as Registry['job_forms.show']['types'],
  },
  'job_forms.save_draft': {
    methods: ["PUT"],
    pattern: '/api/v1/dashboard/jobs/form/draft',
    tokens: [{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"jobs","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"form","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"draft","end":""}],
    types: placeholder as Registry['job_forms.save_draft']['types'],
  },
  'job_forms.publish': {
    methods: ["POST"],
    pattern: '/api/v1/dashboard/jobs/form/draft/publish',
    tokens: [{"old":"/api/v1/dashboard/jobs/form/draft/publish","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs/form/draft/publish","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs/form/draft/publish","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs/form/draft/publish","type":0,"val":"jobs","end":""},{"old":"/api/v1/dashboard/jobs/form/draft/publish","type":0,"val":"form","end":""},{"old":"/api/v1/dashboard/jobs/form/draft/publish","type":0,"val":"draft","end":""},{"old":"/api/v1/dashboard/jobs/form/draft/publish","type":0,"val":"publish","end":""}],
    types: placeholder as Registry['job_forms.publish']['types'],
  },
  'job_forms.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/dashboard/jobs/form/draft',
    tokens: [{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"jobs","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"form","end":""},{"old":"/api/v1/dashboard/jobs/form/draft","type":0,"val":"draft","end":""}],
    types: placeholder as Registry['job_forms.destroy']['types'],
  },
  'jobs.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/jobs/:id',
    tokens: [{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"jobs","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['jobs.show']['types'],
  },
  'jobs.update': {
    methods: ["PUT"],
    pattern: '/api/v1/dashboard/jobs/:id',
    tokens: [{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"jobs","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['jobs.update']['types'],
  },
  'jobs.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/dashboard/jobs/:id',
    tokens: [{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":0,"val":"jobs","end":""},{"old":"/api/v1/dashboard/jobs/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['jobs.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
