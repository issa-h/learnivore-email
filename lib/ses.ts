import { Resend } from 'resend'

function getClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail(params: {
  to: string
  subject: string
  htmlBody: string
}): Promise<string> {
  const fromName = process.env.SES_FROM_NAME || 'Learnivore'
  const fromEmail = process.env.SES_FROM_EMAIL!

  const { data, error } = await getClient().emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [params.to],
    subject: params.subject,
    html: params.htmlBody,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data?.id ?? ''
}
