// Templates des séquences de relance impayés
// Variables disponibles : {{prenom}}, {{date_inscription}}, {{montant_paye}}, {{montant_total}}, {{montant_restant}}, {{lien_paiement}}

const FOOTER = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
<p style="font-size:13px;color:#9ca3af;line-height:1.6;"><em>Learnivore LLC<br>30 N Gould St, STE R<br>Sheridan, WY 82801<br>Wyoming, USA<br>Site : learnivore.fr<br>Email : contact@learnivore.fr</em></p>`

const CORRECTION_NOTE = `<p style="font-size:13px;color:#6b7280;font-style:italic;margin-bottom:16px;">Note : notre précédent message contenait une erreur dans l'adresse de réponse. Nous vous le renvoyons avec la bonne adresse — merci de votre compréhension.</p>`

function greeting(prenom: string | null): string {
  return prenom ? `Bonjour ${prenom},` : 'Bonjour,'
}

// ── ÉTUDIANT BRILLANT ─────────────────────────────────

export const EB_STEPS = [
  {
    delay_days: 0,
    subject: 'Régularisation de votre solde — Formation Étudiant Brillant\u2122',
    html: (v: Vars) => `<p>${greeting(v.prenom)}</p>
<p>Nous vous contactons concernant votre inscription à la <strong>Formation - Étudiant Brillant\u2122</strong>, effectuée en date du ${v.date_inscription}.</p>
<p>Lors de votre inscription, vous avez sélectionné l'option de paiement étalé.<br>À ce jour, vous avez réglé un montant de <strong>${v.montant_paye}\u20AC</strong>.</p>
<p>Le tarif total du programme étant de <strong>${v.montant_total}\u20AC</strong>,<br>il reste donc un solde impayé de <strong>${v.montant_restant}\u20AC</strong>.</p>
<p>Ce montant reste dû au titre de l'engagement que vous avez pris lors de votre inscription.</p>
<p>Vous pouvez régulariser cette situation en réglant la facture suivante via le lien ci-dessous :<br>\uD83D\uDC49 <a href="${v.lien_paiement}">${v.lien_paiement}</a></p>
<p>Si vous avez besoin de mettre en place un échéancier, vous pouvez répondre à ce message afin que nous puissions vous proposer une solution adaptée.</p>
<p>Bien cordialement,</p>
${FOOTER}`,
  },
  {
    delay_days: 7,
    subject: 'Rappel — solde restant dû',
    html: (v: Vars) => `<p>${greeting(v.prenom)}</p>
<p>Nous revenons vers vous concernant le solde de <strong>${v.montant_restant}\u20AC</strong> toujours dû, suite à votre inscription à la <strong>Formation - Étudiant Brillant\u2122</strong> en date du ${v.date_inscription}.</p>
<p>Ce montant correspond à un engagement contractuel pris lors de votre inscription.</p>
<p>À ce jour, ce solde reste impayé.</p>
<p>Nous vous remercions de régulariser cette situation dans les meilleurs délais via le lien suivant :<br>\uD83D\uDC49 <a href="${v.lien_paiement}">${v.lien_paiement}</a></p>
<p>À défaut de régularisation, nous nous réservons la possibilité de transmettre ce dossier pour traitement.</p>
<p>Bien cordialement,</p>
${FOOTER}`,
  },
  {
    delay_days: 14,
    subject: 'Dernière relance — solde impayé',
    html: (v: Vars) => `<p>${greeting(v.prenom)}</p>
<p>Malgré nos précédents messages, le solde de <strong>${v.montant_restant}\u20AC</strong> lié à votre inscription à la <strong>Formation - Étudiant Brillant\u2122</strong> (${v.date_inscription}) reste impayé.</p>
<p>Ce montant est dû au titre de votre engagement lors de votre inscription.</p>
<p>Nous vous demandons de régulariser ce solde sous 7 jours via le lien ci-dessous :<br>\uD83D\uDC49 <a href="${v.lien_paiement}">${v.lien_paiement}</a></p>
<p>À défaut de régularisation dans ce délai, nous nous réservons la possibilité d'engager toute démarche nécessaire au recouvrement de cette somme.</p>
<p>Si vous souhaitez mettre en place un échéancier, merci de nous répondre rapidement.</p>
<p>Bien cordialement,</p>
${FOOTER}`,
  },
]

// ── LE RESET ÉTUDIANT ─────────────────────────────────

export const RE_STEPS = [
  {
    delay_days: 0,
    subject: 'Solde impayé — Programme Reset Étudiant\u2122',
    html: (v: Vars) => `<p>${greeting(v.prenom)}</p>
<p>Nous vous contactons concernant votre inscription au <strong>Programme - Le Reset Étudiant\u2122</strong>, effectuée en date du ${v.date_inscription}.</p>
<p>Lors de votre inscription, vous avez choisi un paiement en plusieurs échéances.<br>À ce jour, vous avez réglé un montant de <strong>${v.montant_paye}\u20AC</strong>.</p>
<p>Le montant total du programme étant de <strong>${v.montant_total}\u20AC</strong>,<br>il reste un solde impayé de <strong>${v.montant_restant}\u20AC</strong>.</p>
<p>Le paiement en plusieurs fois constitue une facilité de paiement.<br>L'engagement porte sur le règlement de l'intégralité du programme, conformément aux conditions acceptées lors de votre inscription.</p>
<p>Nous vous remercions de régulariser cette situation dans les meilleurs délais via le lien suivant :<br>\uD83D\uDC49 <a href="${v.lien_paiement}">${v.lien_paiement}</a></p>
<p>Si vous rencontrez une difficulté, vous pouvez nous répondre afin de convenir d'un échéancier.</p>
<p>Bien cordialement,</p>
${FOOTER}`,
  },
  {
    delay_days: 3,
    subject: 'Rappel — montant dû',
    html: (v: Vars) => `<p>${greeting(v.prenom)}</p>
<p>Nous revenons vers vous concernant le solde de <strong>${v.montant_restant}\u20AC</strong> toujours dû au titre de votre inscription au <strong>Programme - Le Reset Étudiant\u2122</strong> en date du ${v.date_inscription}.</p>
<p>Ce montant correspond à un engagement contractuel pris lors de votre inscription.</p>
<p>À ce jour, ce solde n'a pas été régularisé.</p>
<p>Nous vous demandons de procéder au règlement dans les meilleurs délais via le lien suivant :<br>\uD83D\uDC49 <a href="${v.lien_paiement}">${v.lien_paiement}</a></p>
<p>À défaut de régularisation, nous nous réservons la possibilité de transmettre ce dossier pour traitement.</p>
<p>Bien cordialement,</p>
${FOOTER}`,
  },
  {
    delay_days: 7,
    subject: 'Dernière relance avant traitement du dossier',
    html: (v: Vars) => `<p>${greeting(v.prenom)}</p>
<p>Malgré nos précédents messages, le solde de <strong>${v.montant_restant}\u20AC</strong> lié à votre inscription au <strong>Programme - Le Reset Étudiant\u2122</strong> (${v.date_inscription}) reste impayé.</p>
<p>Ce montant est dû au titre de votre engagement lors de votre inscription.</p>
<p>Nous vous demandons de régulariser ce solde sous 7 jours via le lien ci-dessous :<br>\uD83D\uDC49 <a href="${v.lien_paiement}">${v.lien_paiement}</a></p>
<p>À défaut de régularisation dans ce délai, nous nous réservons la possibilité d'engager toute démarche nécessaire au recouvrement de cette somme.</p>
<p>Si vous rencontrez une difficulté, merci de nous répondre rapidement afin d'envisager une solution.</p>
<p>Bien cordialement,</p>
${FOOTER}`,
  },
]

interface Vars {
  prenom: string | null
  date_inscription: string
  montant_paye: number
  montant_total: number
  montant_restant: number
  lien_paiement: string
}

export function getSteps(sequenceName: string) {
  return sequenceName === 'impaye-eb' ? EB_STEPS : RE_STEPS
}

export function buildEmail(sequenceName: string, stepIndex: number, vars: Vars) {
  const steps = getSteps(sequenceName)
  const step = steps[stepIndex]
  if (!step) return null
  return {
    subject: step.subject,
    htmlBody: step.html(vars),
  }
}
