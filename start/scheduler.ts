import ExpireInformationRequests from '#jobs/expire_information_requests'
import ExpirePendingApplications from '#jobs/expire_pending_applications'
import app from '@adonisjs/core/services/app'

if (!app.inTest) {
  await ExpireInformationRequests.schedule({})
    .id('expire-application-information-requests')
    .every('5m')

  await ExpirePendingApplications.schedule({}).id('expire-pending-applications').every('10m')
}
