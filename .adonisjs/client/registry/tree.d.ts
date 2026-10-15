/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  drive: {
    fs: {
      serve: typeof routes['drive.fs.serve']
    }
  }
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    sessions: {
      login: typeof routes['auth.sessions.login']
    }
    passwordReset: {
      forgot: typeof routes['auth.password_reset.forgot']
      show: typeof routes['auth.password_reset.show']
      update: typeof routes['auth.password_reset.update']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
      update: typeof routes['profile.profile.update']
      updatePassword: typeof routes['profile.profile.update_password']
      updateOrganization: typeof routes['profile.profile.update_organization']
    }
    sessions: {
      destroy: typeof routes['profile.sessions.destroy']
    }
  }
  billing: {
    plans: typeof routes['billing.plans']
    subscription: typeof routes['billing.subscription']
    payments: typeof routes['billing.payments']
    showPayment: typeof routes['billing.show_payment']
    exportApplications: typeof routes['billing.export_applications']
    checkout: typeof routes['billing.checkout']
    confirm: typeof routes['billing.confirm']
  }
  billingWebhook: typeof routes['billing_webhook']
  career: {
    index: typeof routes['career.index']
    show: typeof routes['career.show']
    apply: typeof routes['career.apply']
    resendOtp: typeof routes['career.resend_otp']
    verify: typeof routes['career.verify']
    showSlotRequest: typeof routes['career.show_slot_request']
    showInvitation: typeof routes['career.show_invitation']
    submitSlots: typeof routes['career.submit_slots']
    respondToInvitation: typeof routes['career.respond_to_invitation']
  }
  informationRequests: {
    publicShow: typeof routes['information_requests.public_show']
    publicSubmit: typeof routes['information_requests.public_submit']
    create: typeof routes['information_requests.create']
    list: typeof routes['information_requests.list']
    show: typeof routes['information_requests.show']
    resend: typeof routes['information_requests.resend']
    cancel: typeof routes['information_requests.cancel']
    downloadDocument: typeof routes['information_requests.download_document']
  }
  teamInvitations: {
    publicShow: typeof routes['team_invitations.public_show']
    accept: typeof routes['team_invitations.accept']
    acceptLegacy: typeof routes['team_invitations.accept_legacy']
    publicShowAlias: typeof routes['team_invitations.public_show_alias']
    acceptAlias: typeof routes['team_invitations.accept_alias']
    acceptLegacyAlias: typeof routes['team_invitations.accept_legacy_alias']
    members: typeof routes['team_invitations.members']
    index: typeof routes['team_invitations.index']
    show: typeof routes['team_invitations.show']
    store: typeof routes['team_invitations.store']
    resend: typeof routes['team_invitations.resend']
    cancel: typeof routes['team_invitations.cancel']
  }
  dashboard: {
    stats: typeof routes['dashboard.stats']
    upcomingInterviews: typeof routes['dashboard.upcoming_interviews']
    applicationStatusStats: typeof routes['dashboard.application_status_stats']
    jobStatusStats: typeof routes['dashboard.job_status_stats']
  }
  reports: {
    index: typeof routes['reports.index']
  }
  candidates: {
    index: typeof routes['candidates.index']
    show: typeof routes['candidates.show']
  }
  talentPool: {
    index: typeof routes['talent_pool.index']
    tags: typeof routes['talent_pool.tags']
    show: typeof routes['talent_pool.show']
    downloadDocument: typeof routes['talent_pool.download_document']
    store: typeof routes['talent_pool.store']
    storeFromApplication: typeof routes['talent_pool.store_from_application']
    createTag: typeof routes['talent_pool.create_tag']
    restore: typeof routes['talent_pool.restore']
    addNote: typeof routes['talent_pool.add_note']
    updateNote: typeof routes['talent_pool.update_note']
    destroyNote: typeof routes['talent_pool.destroy_note']
    setTags: typeof routes['talent_pool.set_tags']
    attachToJob: typeof routes['talent_pool.attach_to_job']
    destroy: typeof routes['talent_pool.destroy']
    purge: typeof routes['talent_pool.purge']
  }
  applications: {
    show: typeof routes['applications.show']
    downloadDocument: typeof routes['applications.download_document']
    updateStatus: typeof routes['applications.update_status']
  }
  interviews: {
    indexForApplication: typeof routes['interviews.index_for_application']
    store: typeof routes['interviews.store']
    requestSlots: typeof routes['interviews.request_slots']
    indexAll: typeof routes['interviews.index_all']
    update: typeof routes['interviews.update']
  }
  team: {
    team: {
      index: typeof routes['team.team.index']
      invite: typeof routes['team.team.invite']
    }
  }
  jobs: {
    index: typeof routes['jobs.index']
    store: typeof routes['jobs.store']
    show: typeof routes['jobs.show']
    update: typeof routes['jobs.update']
    destroy: typeof routes['jobs.destroy']
  }
  forms: {
    index: typeof routes['forms.index']
    show: typeof routes['forms.show']
    store: typeof routes['forms.store']
    update: typeof routes['forms.update']
    destroy: typeof routes['forms.destroy']
  }
}
