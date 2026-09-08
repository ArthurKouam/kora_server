/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import {
  careerApplyThrottle,
  loginThrottle,
  otpVerifyThrottle,
  signupThrottle,
} from '#start/limiter'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store']).use([signupThrottle])
        router.post('login', [controllers.Sessions, 'login']).use([loginThrottle])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.put('profile', [controllers.Profile, 'update'])
        router.put('password', [controllers.Profile, 'updatePassword'])
        router
          .put('organization', [controllers.Profile, 'updateOrganization'])
          .use(middleware.permission({ permission: ['settings.org'] }))
        router.post('logout', [controllers.Sessions, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('jobs/:slug', [controllers.Career, 'show'])
        router.post('jobs/:slug/apply', [controllers.Career, 'apply']).use([careerApplyThrottle])
        router
          .post('jobs/:slug/apply/:pendingId/verify', [controllers.Career, 'verify'])
          .use([otpVerifyThrottle])
        router.get('interview-slots/:token', [controllers.Career, 'showSlotRequest'])
        router.post('interview-slots/:token', [controllers.Career, 'submitSlots'])
        router.post('interview-confirmations/:token', [controllers.Career, 'respondToInvitation'])
      })
      .prefix('career')

    router
      .group(() => {
        router.get('stats', [controllers.Dashboard, 'stats'])
        router.get('upcoming-interviews', [controllers.Dashboard, 'upcomingInterviews'])
        router.get('application-status-stats', [controllers.Dashboard, 'applicationStatusStats'])
        router.get('job-status-stats', [controllers.Dashboard, 'jobStatusStats'])
        router.get('reports', [controllers.Reports, 'index'])

        router.get('candidates', [controllers.Candidates, 'index'])
        router.get('candidates/:id', [controllers.Candidates, 'show'])

        router.get('applications/:id', [controllers.Applications, 'show'])
        router.get('applications/:id/documents/:documentId', [
          controllers.Applications,
          'downloadDocument',
        ])
        router
          .put('applications/:id/status', [controllers.Applications, 'updateStatus'])
          .use(middleware.permission({ permission: ['applications.pipeline'] }))

        router
          .group(() => {
            router.get('/', [controllers.Interviews, 'indexForApplication'])
            router
              .post('/', [controllers.Interviews, 'store'])
              .use(middleware.permission({ permission: ['interviews.schedule'] }))
          })
          .prefix('applications/:id/interviews')
        router
          .post('applications/:id/slot-requests', [controllers.Interviews, 'requestSlots'])
          .use(middleware.permission({ permission: ['interviews.schedule'] }))
        router.get('interviews', [controllers.Interviews, 'indexAll'])
        router.put('interviews/:id', [controllers.Interviews, 'update'])

        router
          .group(() => {
            router.get('/', [controllers.Jobs, 'index'])
            router
              .post('/', [controllers.Jobs, 'store'])
              .use(middleware.permission({ permission: ['jobs.create'] }))
            router.get('/form', [controllers.JobForms, 'show'])
            router
              .put('/form/draft', [controllers.JobForms, 'saveDraft'])
              .use(middleware.permission({ permission: ['forms.update'] }))
            router
              .post('/form/draft/publish', [controllers.JobForms, 'publish'])
              .use(middleware.permission({ permission: ['forms.publish'] }))
            router
              .delete('/form/draft', [controllers.JobForms, 'destroy'])
              .use(middleware.permission({ permission: ['forms.update'] }))
            router.get('/:id', [controllers.Jobs, 'show'])
            router
              .put('/:id', [controllers.Jobs, 'update'])
              .use(middleware.permission({ permission: ['jobs.update'] }))
            router
              .delete('/:id', [controllers.Jobs, 'destroy'])
              .use(middleware.permission({ permission: ['jobs.delete'] }))
          })
          .prefix('jobs')
      })
      .prefix('dashboard')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
