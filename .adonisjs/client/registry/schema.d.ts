/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'drive.fs.serve': {
    methods: ["GET","HEAD"]
    pattern: '/uploads/*'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { '*': ParamValue[] }
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.sessions.login': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['login']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.profile.update': {
    methods: ["PUT"]
    pattern: '/api/v1/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.update_password': {
    methods: ["PUT"]
    pattern: '/api/v1/account/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').updatePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').updatePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updatePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updatePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.update_organization': {
    methods: ["PUT"]
    pattern: '/api/v1/account/organization'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings').updateOrganizationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings').updateOrganizationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updateOrganization']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['updateOrganization']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.sessions.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['destroy']>>>
    }
  }
  'career.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/jobs/:slug'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['show']>>>
    }
  }
  'career.apply': {
    methods: ["POST"]
    pattern: '/api/v1/career/jobs/:slug/apply'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/career').applyValidator)>>
      paramsTuple: [ParamValue]
      params: { slug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/career').applyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['apply']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'career.verify': {
    methods: ["POST"]
    pattern: '/api/v1/career/jobs/:slug/apply/:pendingId/verify'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/career').verifyOtpValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { slug: ParamValue; pendingId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/career').verifyOtpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['verify']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'career.show_slot_request': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/interview-slots/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['showSlotRequest']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['showSlotRequest']>>>
    }
  }
  'career.submit_slots': {
    methods: ["POST"]
    pattern: '/api/v1/career/interview-slots/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/career').submitSlotsValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/career').submitSlotsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['submitSlots']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['submitSlots']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'career.respond_to_invitation': {
    methods: ["POST"]
    pattern: '/api/v1/career/interview-confirmations/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['respondToInvitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['respondToInvitation']>>>
    }
  }
  'dashboard.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['stats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['stats']>>>
    }
  }
  'dashboard.upcoming_interviews': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/upcoming-interviews'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['upcomingInterviews']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['upcomingInterviews']>>>
    }
  }
  'dashboard.application_status_stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/application-status-stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['applicationStatusStats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['applicationStatusStats']>>>
    }
  }
  'dashboard.job_status_stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/job-status-stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['jobStatusStats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['jobStatusStats']>>>
    }
  }
  'reports.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/reports'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/reports_controller').default['index']>>>
    }
  }
  'candidates.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/candidates'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/candidates_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/candidates_controller').default['index']>>>
    }
  }
  'candidates.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/candidates/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/candidates_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/candidates_controller').default['show']>>>
    }
  }
  'applications.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/applications_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/applications_controller').default['show']>>>
    }
  }
  'applications.download_document': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id/documents/:documentId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; documentId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/applications_controller').default['downloadDocument']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/applications_controller').default['downloadDocument']>>>
    }
  }
  'applications.update_status': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/applications/:id/status'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/application').updateApplicationStatusValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/application').updateApplicationStatusValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/applications_controller').default['updateStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/applications_controller').default['updateStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'interviews.index_for_application': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id/interviews'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['indexForApplication']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['indexForApplication']>>>
    }
  }
  'interviews.store': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/applications/:id/interviews'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/interview').createInterviewValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/interview').createInterviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'interviews.request_slots': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/applications/:id/slot-requests'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/interview').createSlotRequestValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/interview').createSlotRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['requestSlots']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['requestSlots']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'interviews.index_all': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/interviews'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['indexAll']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['indexAll']>>>
    }
  }
  'interviews.update': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/interviews/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/interview').updateInterviewValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/interview').updateInterviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interviews_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'jobs.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/jobs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['index']>>>
    }
  }
  'jobs.store': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/jobs'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/job').createJobValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/job').createJobValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'job_forms.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/jobs/form'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['show']>>>
    }
  }
  'job_forms.save_draft': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/jobs/form/draft'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['saveDraft']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['saveDraft']>>>
    }
  }
  'job_forms.publish': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/jobs/form/draft/publish'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['publish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['publish']>>>
    }
  }
  'job_forms.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/jobs/form/draft'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['destroy']>>>
    }
  }
  'jobs.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/jobs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['show']>>>
    }
  }
  'jobs.update': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/jobs/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/job').updateJobValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/job').updateJobValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'jobs.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/jobs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['destroy']>>>
    }
  }
}
