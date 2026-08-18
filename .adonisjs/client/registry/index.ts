/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
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
  'profile.sessions.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.sessions.destroy']['types'],
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
  'candidates.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/dashboard/candidates',
    tokens: [{"old":"/api/v1/dashboard/candidates","type":0,"val":"api","end":""},{"old":"/api/v1/dashboard/candidates","type":0,"val":"v1","end":""},{"old":"/api/v1/dashboard/candidates","type":0,"val":"dashboard","end":""},{"old":"/api/v1/dashboard/candidates","type":0,"val":"candidates","end":""}],
    types: placeholder as Registry['candidates.index']['types'],
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
