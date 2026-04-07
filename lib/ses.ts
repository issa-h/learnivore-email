import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function sendEmail(params: {
  to: string
  subject: string
  htmlBody: string
}): Promise<string> {
  const fromName = process.env.SES_FROM_NAME || 'Learnivore'
  const fromEmail = process.env.SES_FROM_EMAIL!

  const command = new SendEmailCommand({
    Source: `${fromName} <${fromEmail}>`,
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: params.subject, Charset: 'UTF-8' },
      Body: { Html: { Data: params.htmlBody, Charset: 'UTF-8' } },
    },
  })

  const result = await ses.send(command)
  return result.MessageId ?? ''
}
