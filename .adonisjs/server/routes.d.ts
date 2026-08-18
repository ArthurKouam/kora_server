import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.login': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.sessions.destroy': { paramsTuple?: []; params?: {} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.store': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'dashboard.stats': { paramsTuple?: []; params?: {} }
    'dashboard.upcoming_interviews': { paramsTuple?: []; params?: {} }
    'dashboard.application_status_stats': { paramsTuple?: []; params?: {} }
    'dashboard.job_status_stats': { paramsTuple?: []; params?: {} }
    'candidates.index': { paramsTuple?: []; params?: {} }
    'jobs.index': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.sessions.login': { paramsTuple?: []; params?: {} }
    'profile.sessions.destroy': { paramsTuple?: []; params?: {} }
    'jobs.store': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'jobs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'jobs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}