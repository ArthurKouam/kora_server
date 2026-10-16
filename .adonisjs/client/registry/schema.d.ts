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
  'auth.password_reset.forgot': {
    methods: ["POST"]
    pattern: '/api/v1/auth/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['forgot']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['forgot']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.password_reset.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/auth/reset-password/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['show']>>>
    }
  }
  'auth.password_reset.update': {
    methods: ["POST"]
    pattern: '/api/v1/auth/reset-password/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_reset_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'billing.plans': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/plans'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['plans']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['plans']>>>
    }
  }
  'billing_webhook': {
    methods: ["POST"]
    pattern: '/api/v1/billing/webhooks/notchpay'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_webhook_controller').default['handle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_webhook_controller').default['handle']>>>
    }
  }
  'billing.subscription': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/subscription'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['subscription']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['subscription']>>>
    }
  }
  'billing.payments': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/payments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['payments']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['payments']>>>
    }
  }
  'billing.show_payment': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/payments/:reference'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { reference: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['showPayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['showPayment']>>>
    }
  }
  'billing.export_applications': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/billing/applications/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/billing').exportApplicationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['exportApplications']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['exportApplications']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.checkout': {
    methods: ["POST"]
    pattern: '/api/v1/billing/checkout'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing').checkoutValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing').checkoutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['checkout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['checkout']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'billing.confirm': {
    methods: ["POST"]
    pattern: '/api/v1/billing/confirm'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/billing').confirmValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/billing').confirmValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/billing_controller').default['confirm']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'career.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/orgs/:orgSlug/jobs'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { orgSlug: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/career').careerIndexValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'career.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/orgs/:orgSlug/jobs/:jobSlug'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; jobSlug: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['show']>>>
    }
  }
  'career.apply': {
    methods: ["POST"]
    pattern: '/api/v1/career/orgs/:orgSlug/jobs/:jobSlug/apply'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/career').applyValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; jobSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/career').applyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['apply']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['apply']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'career.verify': {
    methods: ["POST"]
    pattern: '/api/v1/career/orgs/:orgSlug/jobs/:jobSlug/verify'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/career').verifyOtpValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; jobSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/career').verifyOtpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['verify']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'career.resend_otp': {
    methods: ["POST"]
    pattern: '/api/v1/career/orgs/:orgSlug/jobs/:jobSlug/verify/resend'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/career').resendOtpValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { orgSlug: ParamValue; jobSlug: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/career').resendOtpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['resendOtp']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['resendOtp']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'career.show_invitation': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/interview-invitations/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/career_controller').default['showInvitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/career_controller').default['showInvitation']>>>
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
  'information_requests.public_show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/information-requests/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['publicShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['publicShow']>>>
    }
  }
  'information_requests.public_submit': {
    methods: ["POST"]
    pattern: '/api/v1/career/information-requests/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/information_request').submitInformationRequestValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/information_request').submitInformationRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['publicSubmit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['publicSubmit']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'team_invitations.public_show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/team-invitations/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicShow']>>>
    }
  }
  'team_invitations.accept': {
    methods: ["POST"]
    pattern: '/api/v1/career/team-invitations/:token/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'team_invitations.accept_legacy': {
    methods: ["POST"]
    pattern: '/api/v1/career/team-invitations/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'team_invitations.public_show_alias': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/career/invitations/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicShow']>>>
    }
  }
  'team_invitations.accept_alias': {
    methods: ["POST"]
    pattern: '/api/v1/career/invitations/:token/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'team_invitations.accept_legacy_alias': {
    methods: ["POST"]
    pattern: '/api/v1/career/invitations/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/team_invitation').acceptTeamInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['publicAccept']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'team_invitations.members': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/team/members'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['members']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['members']>>>
    }
  }
  'team_invitations.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/team/invitations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['index']>>>
    }
  }
  'team_invitations.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/team/invitations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['show']>>>
    }
  }
  'team_invitations.store': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/team/invitations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/team_invitation').createTeamInvitationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/team_invitation').createTeamInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'team_invitations.resend': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/team/invitations/:id/resend'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['resend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['resend']>>>
    }
  }
  'team_invitations.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/team/invitations/:id/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/team_invitations_controller').default['cancel']>>>
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
  'talent_pool.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/talent-pool'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/talent_pool').talentPoolIndexValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.tags': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/talent-pool/tags'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['tags']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['tags']>>>
    }
  }
  'talent_pool.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/talent-pool/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['show']>>>
    }
  }
  'talent_pool.download_document': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/talent-pool/:id/documents/:documentId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; documentId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['downloadDocument']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['downloadDocument']>>>
    }
  }
  'talent_pool.store': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/talent-pool'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').createManualEntryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').createManualEntryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.store_from_application': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/talent-pool/from-application'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').createEntryFromApplicationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').createEntryFromApplicationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['storeFromApplication']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['storeFromApplication']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.create_tag': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/talent-pool/tags'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').createTagValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').createTagValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['createTag']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['createTag']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.restore': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/talent-pool/:id/restore'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['restore']>>>
    }
  }
  'talent_pool.add_note': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/talent-pool/:id/notes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').noteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').noteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['addNote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['addNote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.update_note': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/talent-pool/:id/notes/:noteId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').noteValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; noteId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').noteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['updateNote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['updateNote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.destroy_note': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/talent-pool/:id/notes/:noteId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; noteId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['destroyNote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['destroyNote']>>>
    }
  }
  'talent_pool.set_tags': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/talent-pool/:id/tags'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').setTagsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').setTagsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['setTags']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['setTags']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.attach_to_job': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/talent-pool/:id/attach'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').attachToJobValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').attachToJobValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['attachToJob']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['attachToJob']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/talent-pool/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').removeEntryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').removeEntryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['destroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'talent_pool.purge': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/talent-pool/:id/purge'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/talent_pool').purgeEntryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/talent_pool').purgeEntryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['purge']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/talent_pool_controller').default['purge']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'information_requests.create': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/applications/:id/information-requests'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/information_request').createInformationRequestValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/information_request').createInformationRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['create']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'information_requests.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id/information-requests'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['list']>>>
    }
  }
  'information_requests.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id/information-requests/:requestId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; requestId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['show']>>>
    }
  }
  'information_requests.resend': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/applications/:id/information-requests/:requestId/resend'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; requestId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['resend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['resend']>>>
    }
  }
  'information_requests.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/applications/:id/information-requests/:requestId/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; requestId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['cancel']>>>
    }
  }
  'information_requests.download_document': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id/information-requests/:requestId/documents/:documentId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue, ParamValue]
      params: { id: ParamValue; requestId: ParamValue; documentId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['downloadDocument']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/information_requests_controller').default['downloadDocument']>>>
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
  'job_evaluation_criteria.sources': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/jobs/evaluation-criteria-sources'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['sources']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['sources']>>>
    }
  }
  'job_evaluation_criteria.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/jobs/:id/evaluation-criteria'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['index']>>>
    }
  }
  'job_evaluation_criteria.save': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/jobs/:id/evaluation-criteria'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/job_evaluation_criteria').saveJobEvaluationCriteriaValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/job_evaluation_criteria').saveJobEvaluationCriteriaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['save']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['save']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'job_evaluation_criteria.duplicate': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/jobs/:id/evaluation-criteria/duplicate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/job_evaluation_criteria').duplicateJobEvaluationCriteriaValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/job_evaluation_criteria').duplicateJobEvaluationCriteriaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['duplicate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_evaluation_criteria_controller').default['duplicate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'evaluations.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id/evaluations'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/evaluations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/evaluations_controller').default['index']>>>
    }
  }
  'evaluations.upsert': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/applications/:id/evaluations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/evaluation').upsertEvaluationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/evaluation').upsertEvaluationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/evaluations_controller').default['upsert']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/evaluations_controller').default['upsert']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'evaluations.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/applications/:id/evaluations/:evaluationId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; evaluationId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/evaluations_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/evaluations_controller').default['destroy']>>>
    }
  }
  'application_notes.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/applications/:id/notes'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['index']>>>
    }
  }
  'application_notes.store': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/applications/:id/notes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/application_note').createApplicationNoteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/application_note').createApplicationNoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'application_notes.update': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/applications/:id/notes/:noteId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/application_note').updateApplicationNoteValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; noteId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/application_note').updateApplicationNoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'application_notes.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/applications/:id/notes/:noteId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; noteId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/application_notes_controller').default['destroy']>>>
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
  'job_forms.sources': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/jobs/form-sources'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['sources']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['sources']>>>
    }
  }
  'job_forms.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/dashboard/jobs/:id/form'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['show']>>>
    }
  }
  'job_forms.save_draft': {
    methods: ["PUT"]
    pattern: '/api/v1/dashboard/jobs/:id/form/draft'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['saveDraft']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['saveDraft']>>>
    }
  }
  'job_forms.publish': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/jobs/:id/form/draft/publish'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['publish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['publish']>>>
    }
  }
  'job_forms.duplicate_draft': {
    methods: ["POST"]
    pattern: '/api/v1/dashboard/jobs/:id/form/draft/duplicate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/job').duplicateJobFormValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/job').duplicateJobFormValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['duplicateDraft']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/job_forms_controller').default['duplicateDraft']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'job_forms.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/dashboard/jobs/:id/form/draft'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
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
