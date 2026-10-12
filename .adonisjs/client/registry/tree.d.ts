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
  jobForms: {
    show: typeof routes['job_forms.show']
    saveDraft: typeof routes['job_forms.save_draft']
    publish: typeof routes['job_forms.publish']
    destroy: typeof routes['job_forms.destroy']
  }
}
