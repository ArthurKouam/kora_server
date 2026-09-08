import ExpireInformationRequests from '#jobs/expire_information_requests'
import app from '@adonisjs/core/services/app'

if (!app.inTest) {
  await ExpireInformationRequests.schedule({})
    .id('expire-application-information-requests')
    .every('5m')
}
