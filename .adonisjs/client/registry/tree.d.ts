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
  career: {
    show: typeof routes['career.show']
    apply: typeof routes['career.apply']
    resendOtp: typeof routes['career.resend_otp']
    verify: typeof routes['career.verify']
    showSlotRequest: typeof routes['career.show_slot_request']
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
