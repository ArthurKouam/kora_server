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
  careerListThrottle,
  informationRequestGetIpThrottle,
  informationRequestGetTokenThrottle,
  informationRequestPostIpThrottle,
  informationRequestPostTokenThrottle,
  forgotPasswordThrottle,
  loginThrottle,
  otpVerifyThrottle,
  passwordResetThrottle,
  signupThrottle,
} from '#start/limiter'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

const InformationRequestsController = () => import('#controllers/information_requests_controller')

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store']).use([signupThrottle])
        router.post('login', [controllers.Sessions, 'login']).use([loginThrottle])

        // Mot de passe oublié — public, l'utilisateur ayant perdu ses accès.
        router
          .post('forgot-password', [controllers.PasswordReset, 'forgot'])
          .use([forgotPasswordThrottle])
        router
          .get('reset-password/:token', [controllers.PasswordReset, 'show'])
          .use([passwordResetThrottle])
        router
          .post('reset-password/:token', [controllers.PasswordReset, 'update'])
          .use([passwordResetThrottle])
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

    /**
     * Facturation — plans, abonnement, paiement Mobile Money.
     *
     * `/plans` est public : la page tarifs doit s'afficher sans compte.
     * Le webhook est hors du groupe authentifié (la confiance vient de la
     * signature HMAC) mais reste protégé par `auth_middleware` : aucune
     * donnée du tenant n'y est lu, seul le statut d'un paiement.
     *
     * `export` n'est volontairement PAS soumis à `activeSubscription` :
     * une organisation expirée doit pouvoir récupérer ses candidatures.
     */
    router
      .group(() => {
        router.get('plans', [controllers.Billing, 'plans'])
      })
      .prefix('billing')

    router
      .group(() => {
        router.post('webhooks/notchpay', [controllers.BillingWebhook, 'handle'])
      })
      .prefix('billing')

    router
      .group(() => {
        router.get('subscription', [controllers.Billing, 'subscription'])
        router.get('payments', [controllers.Billing, 'payments'])
        router.get('payments/:reference', [controllers.Billing, 'showPayment'])
        router.get('applications/export', [controllers.Billing, 'exportApplications'])
        router.post('checkout', [controllers.Billing, 'checkout'])
        router.post('confirm', [controllers.Billing, 'confirm'])
      })
      .prefix('billing')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('orgs/:orgSlug/jobs', [controllers.Career, 'index']).use([careerListThrottle])
        router.get('orgs/:orgSlug/jobs/:jobSlug', [controllers.Career, 'show'])
        router
          .post('orgs/:orgSlug/jobs/:jobSlug/apply', [controllers.Career, 'apply'])
          .use([careerApplyThrottle])
        router
          .post('orgs/:orgSlug/jobs/:jobSlug/apply/:pendingId/verify', [
            controllers.Career,
            'verify',
          ])
          .use([otpVerifyThrottle])
        router.get('interview-slots/:token', [controllers.Career, 'showSlotRequest'])
        router.get('interview-invitations/:token', [controllers.Career, 'showInvitation'])
        router.post('interview-slots/:token', [controllers.Career, 'submitSlots'])
        router.post('interview-confirmations/:token', [controllers.Career, 'respondToInvitation'])
        router
          .get('information-requests/:token', [InformationRequestsController, 'publicShow'])
          .use([informationRequestGetIpThrottle, informationRequestGetTokenThrottle])
        router
          .post('information-requests/:token', [InformationRequestsController, 'publicSubmit'])
          .use([informationRequestPostIpThrottle, informationRequestPostTokenThrottle])
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

        /**
         * Vivier de talents — capacité payante réservée aux forfaits ≥ 20 000 XAF.
         *
         * Le verrou de forfait (`planFeature`) passe avant le RBAC : inutile de
         * découvrir l'existence d'une fonctionnalité qu'on ne peut pas avoir.
         */
        router
          .group(() => {
            router.get('/', [controllers.TalentPool, 'index'])
            router.get('/tags', [controllers.TalentPool, 'tags'])
            router.get('/:id', [controllers.TalentPool, 'show'])
            router.get('/:id/documents/:documentId', [controllers.TalentPool, 'downloadDocument'])
          })
          .prefix('talent-pool')
          .use([
            middleware.requireOrganization(),
            middleware.planFeature({ feature: 'talentPool', label: 'vivier de talents' }),
            middleware.permission({ permission: ['talent_pool.read'] }),
          ])

        router
          .group(() => {
            router.post('/', [controllers.TalentPool, 'store'])
            router.post('/from-application', [controllers.TalentPool, 'storeFromApplication'])
            router.post('/tags', [controllers.TalentPool, 'createTag'])
            router.post('/:id/restore', [controllers.TalentPool, 'restore'])
            router.post('/:id/notes', [controllers.TalentPool, 'addNote'])
            router.put('/:id/notes/:noteId', [controllers.TalentPool, 'updateNote'])
            router.delete('/:id/notes/:noteId', [controllers.TalentPool, 'destroyNote'])
            router.put('/:id/tags', [controllers.TalentPool, 'setTags'])
            router.post('/:id/attach', [controllers.TalentPool, 'attachToJob'])
            router.delete('/:id', [controllers.TalentPool, 'destroy'])
            router.delete('/:id/purge', [controllers.TalentPool, 'purge'])
          })
          .prefix('talent-pool')
          .use([
            middleware.planFeature({ feature: 'talentPool', label: 'vivier de talents' }),
            middleware.permission({ permission: ['talent_pool.manage'] }),
            middleware.activeSubscription({ write: ['talent_pool.manage'] }),
            middleware.requireOrganization(),
          ])

        router.get('applications/:id', [controllers.Applications, 'show'])
        router.get('applications/:id/documents/:documentId', [
          controllers.Applications,
          'downloadDocument',
        ])
        router
          .put('applications/:id/status', [controllers.Applications, 'updateStatus'])
          .use([
            middleware.permission({ permission: ['applications.pipeline'] }),
            middleware.activeSubscription({ write: ['applications.pipeline'] }),
          ])

        router
          .group(() => {
            router
              .post('/', [InformationRequestsController, 'create'])
              .use(middleware.activeSubscription({ write: ['applications.request_information'] }))
            router.get('/', [InformationRequestsController, 'list'])
            router.get('/:requestId', [InformationRequestsController, 'show'])
            router
              .post('/:requestId/resend', [InformationRequestsController, 'resend'])
              .use(middleware.activeSubscription({ write: ['applications.request_information'] }))
            router
              .post('/:requestId/cancel', [InformationRequestsController, 'cancel'])
              .use(middleware.activeSubscription({ write: ['applications.request_information'] }))
            router.get('/:requestId/documents/:documentId', [
              InformationRequestsController,
              'downloadDocument',
            ])
          })
          .prefix('applications/:id/information-requests')
          .use(middleware.permission({ permission: ['applications.request_information'] }))

        router
          .group(() => {
            router.get('/', [controllers.Interviews, 'indexForApplication'])
            router
              .post('/', [controllers.Interviews, 'store'])
              .use([
                middleware.permission({ permission: ['interviews.schedule'] }),
                middleware.activeSubscription({ write: ['interviews.schedule'] }),
              ])
          })
          .prefix('applications/:id/interviews')
        router
          .post('applications/:id/slot-requests', [controllers.Interviews, 'requestSlots'])
          .use([
            middleware.permission({ permission: ['interviews.schedule'] }),
            middleware.activeSubscription({ write: ['interviews.schedule'] }),
          ])
        router.get('interviews', [controllers.Interviews, 'indexAll'])
        router
          .put('interviews/:id', [controllers.Interviews, 'update'])
          .use([
            middleware.permission({ permission: ['interviews.update'] }),
            middleware.activeSubscription({ write: ['interviews.update'] }),
          ])

        /**
         * Équipe — l'invitation est couverte par le quota `max_members` du
         * plan, vérifié dans le contrôleur avant l'envoi de l'email.
         */
        router
          .group(() => {
            router.get('team', [controllers.Team, 'index'])
            router.post('team/invitations', [controllers.Team, 'invite'])
          })
          .as('team')

        router
          .group(() => {
            router.get('/', [controllers.Jobs, 'index'])
            router
              .post('/', [controllers.Jobs, 'store'])
              .use([
                middleware.permission({ permission: ['jobs.create'] }),
                middleware.activeSubscription({ write: ['jobs.create'] }),
              ])
            router.get('/:id/form', [controllers.JobForms, 'show'])
            router
              .put('/:id/form/draft', [controllers.JobForms, 'saveDraft'])
              .use([
                middleware.permission({ permission: ['forms.update'] }),
                middleware.activeSubscription({ write: ['forms.update'] }),
              ])
            router
              .post('/:id/form/draft/publish', [controllers.JobForms, 'publish'])
              .use([
                middleware.permission({ permission: ['forms.publish'] }),
                middleware.activeSubscription({ write: ['forms.publish'] }),
              ])
            router
              .delete('/:id/form/draft', [controllers.JobForms, 'destroy'])
              .use([
                middleware.permission({ permission: ['forms.update'] }),
                middleware.activeSubscription({ write: ['forms.update'] }),
              ])
            router.get('/:id', [controllers.Jobs, 'show'])
            router
              .put('/:id', [controllers.Jobs, 'update'])
              .use([
                middleware.permission({ permission: ['jobs.update'] }),
                middleware.activeSubscription({ write: ['jobs.update'] }),
              ])
            router
              .delete('/:id', [controllers.Jobs, 'destroy'])
              .use([
                middleware.permission({ permission: ['jobs.delete'] }),
                middleware.activeSubscription({ write: ['jobs.delete'] }),
              ])
          })
          .prefix('jobs')
      })
      .prefix('dashboard')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
