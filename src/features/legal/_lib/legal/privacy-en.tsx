import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { LegalTableScroll } from "@/features/legal/_lib/legal/legal-document-parts";
import {
  EXTERNAL_POLICY_URLS,
  SENTRY_ENABLED,
} from "@/features/legal/_lib/legal/legal-document-parts";

import { ROUTES } from "@/constants/routes";
import { SENTRY_TRANSFER_COUNTRY } from "@/lib/monitoring/monitoring-dsn";

import type { LegalDocument } from "@/features/legal/_lib/legal/legal-document";

/** 개인정보 처리와 로컬 저장소 계약의 영어 원문. */
const PRIVACY_EN: LegalDocument = {
  eyebrow: "Privacy",
  title: "Privacy Policy",
  effective: "Effective: August 10, 2026",
  sections: [
    {
      title: "Operator and contact",
      content: (
        <p>
          This personal portfolio is operated by Sungjoon Lee. To request access, correction,
          deletion, restriction, withdrawal of consent, or help with any privacy matter, use the{" "}
          <LocalizedLink href={ROUTES.CONTACT}>contact page</LocalizedLink>.
        </p>
      ),
    },
    {
      title: "Information, purposes, and retention",
      content: (
        <>
          <LegalTableScroll label="Information and retention table">
            <table>
              <thead>
                <tr>
                  <th>Information</th>
                  <th>Purpose</th>
                  <th>Retention</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Name, email, and enquiry</td>
                  <td>Deliver and answer an enquiry</td>
                  <td>
                    Until the enquiry is resolved or deletion is requested; Web3Forms policy
                    allows retention for up to three years
                  </td>
                </tr>
                <tr>
                  <td>Chatbot question and limited context</td>
                  <td>Generate an AI response</td>
                  <td>Not stored in the site database; removed from browser memory on refresh</td>
                </tr>
                <tr>
                  <td>Hashed IP rate-limit key</td>
                  <td>Prevent chatbot abuse</td>
                  <td>About one minute</td>
                </tr>
                <tr>
                  <td>Visited pages and general device/browser data</td>
                  <td>Consented usage analytics</td>
                  <td>Under Google Analytics settings and policy</td>
                </tr>
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>
                      Error details, a screen replay of the failure, general device data, and
                      approximate city-level location
                    </td>
                    <td>Error diagnosis and fixes for consenting visitors</td>
                    <td>Sentry Developer plan · 30 days</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </LegalTableScroll>
          <p>
            Hosting, security, and error handling may also temporarily create standard provider
            logs containing an IP address, request time, path, and user agent.
          </p>
        </>
      ),
    },
    {
      title: "Language, cookies, and local storage",
      content: (
        <>
          <p>
            At the unprefixed root URL, the site reads <code>Accept-Language</code> to suggest
            Korean or English. The raw header is not separately stored.
          </p>
          <LegalTableScroll label="Cookies and local storage table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Purpose</th>
                  <th>Type and duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>ap-lang-pref-v1</code>
                  </td>
                  <td>Remember an explicit language choice</td>
                  <td>Functional first-party cookie · 30 days</td>
                </tr>
                <tr>
                  <td>
                    <code>ap-lang:v1</code>
                  </td>
                  <td>Remember an explicit language choice</td>
                  <td>localStorage · until you clear it</td>
                </tr>
                <tr>
                  <td>
                    <code>ap-theme:v1</code>
                  </td>
                  <td>Remember the light or dark appearance you chose</td>
                  <td>localStorage · until you clear it</td>
                </tr>
                <tr>
                  <td>
                    <code>ap-consent:v3</code>
                  </td>
                  <td>Remember separate analytics and error-reporting choices</td>
                  <td>localStorage · 180 days</td>
                </tr>
                <tr>
                  <td>
                    <code>_ga</code>, <code>_ga_*</code>
                  </td>
                  <td>Measure consented visits and retain analytics state</td>
                  <td>Optional analytics cookies · up to two years under Google defaults</td>
                </tr>
                <tr>
                  <td>
                    <code>ap-contact-draft:v1</code>
                  </td>
                  <td>
                    Transfer a chatbot contact draft to the contact form after the visitor presses
                    the continue button
                  </td>
                  <td>
                    sessionStorage · deleted as soon as the contact page reads it, 10 minutes at
                    most
                  </td>
                </tr>
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>
                      <code>sentryReplaySession</code>
                    </td>
                    <td>Identify a consented error replay session</td>
                    <td>sessionStorage · removed when the tab closes</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </LegalTableScroll>
          <p>
            The language cookie is created only after a menu choice and is not combined with
            analytics identifiers. Analytics and error-reporting storage is created only after
            permission. Change the choice in Privacy &amp; cookie settings in the footer or clear
            site storage in the browser.
          </p>
        </>
      ),
    },
    {
      title: "External processing and international transfers",
      content: (
        <>
          <p>
            The features below may transmit information to provider servers outside the visitor’s
            country. Processing regions and retention depend on provider terms, account settings,
            and deployment configuration.
          </p>
          <h3>International transfers for optional features</h3>
          <LegalTableScroll label="Optional feature transfer details">
            <table>
              <thead>
                <tr>
                  <th>Recipient and contact</th>
                  <th>Information</th>
                  <th>Country, timing, and method</th>
                  <th>Purpose and retention</th>
                  <th>How to refuse and effect</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    Google LLC ·{" "}
                    <a href={EXTERNAL_POLICY_URLS.googlePrivacyContact}>privacy contact form</a>
                  </td>
                  <td>Visited pages, events, and general device/browser information</td>
                  <td>United States · when an event occurs · HTTPS</td>
                  <td>Usage analytics · event data for 14 months</td>
                  <td>Turn off Visitor analytics in settings; site features remain available</td>
                </tr>
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>Sentry, Inc. · privacy@sentry.io</td>
                    <td>
                      Error details, recording around an error, general device/browser data, and
                      approximate city-level location
                    </td>
                    <td>
                      {SENTRY_TRANSFER_COUNTRY.en} · when an error occurs · HTTPS through a
                      same-origin tunnel
                    </td>
                    <td>Error diagnosis and fixes · 30 days</td>
                    <td>Turn off Error reporting in settings; site features remain available</td>
                  </tr>
                ) : null}
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>
                      OpenAI, L.L.C. and/or Google LLC ·{" "}
                      <a href={EXTERNAL_POLICY_URLS.openAi}>OpenAI</a> ·{" "}
                      <a href={EXTERNAL_POLICY_URLS.gemini}>Google</a>
                    </td>
                    <td>
                      Error title, type, message, code stack locations, deployment environment and
                      release
                    </td>
                    <td>United States · when an error alert fires · HTTPS</td>
                    <td>
                      Severity triage and suggested fixes · kept in this site&apos;s database
                      until the purpose ends or deletion is requested
                    </td>
                    <td>
                      Turn off Error reporting in settings to stop browser errors; server errors
                      are processed regardless of consent
                    </td>
                  </tr>
                ) : null}
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>Discord Inc. · privacy@discord.com</td>
                    <td>Error details and location, environment, release, and the AI verdict</td>
                    <td>United States · when an error alert fires · HTTPS</td>
                    <td>Operator alerts · until deleted from the channel</td>
                    <td>
                      Turn off Error reporting in settings to stop browser errors; server errors
                      are processed regardless of consent
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </LegalTableScroll>
          <LegalTableScroll label="External providers and transfers table">
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Information</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vercel</td>
                  <td>Request and service logs</td>
                  <td>Hosting, security, and error handling</td>
                </tr>
                <tr>
                  <td>Web3Forms, hCaptcha</td>
                  <td>Enquiry, captcha token, and request information</td>
                  <td>Enquiry delivery and spam prevention</td>
                </tr>
                <tr>
                  <td>Google Analytics</td>
                  <td>Consented visit and device data</td>
                  <td>Site usage analytics</td>
                </tr>
                <tr>
                  <td>OpenAI and/or Google Gemini</td>
                  <td>Chatbot question and limited context</td>
                  <td>AI response generation</td>
                </tr>
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>Sentry</td>
                    <td>
                      Error details and screen replays from consenting visitors; server error logs
                    </td>
                    <td>Error diagnosis and fixes</td>
                  </tr>
                ) : null}
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>OpenAI and/or Google Gemini</td>
                    <td>
                      Error summary (title, type, message, code stack locations, environment,
                      release)
                    </td>
                    <td>Severity triage and suggested fixes</td>
                  </tr>
                ) : null}
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>Discord</td>
                    <td>Error summary and the AI verdict</td>
                    <td>Operator error alerts</td>
                  </tr>
                ) : null}
                <tr>
                  <td>Upstash</td>
                  <td>SHA-256 hashed IP key and aggregate count</td>
                  <td>Chatbot rate limiting</td>
                </tr>
              </tbody>
            </table>
          </LegalTableScroll>
          <p>
            OpenAI requests set <code>store: false</code> to disable application-state storage.
            OpenAI and Google may still retain limited abuse-monitoring logs under their policies
            and account settings. Google Signals and advertising personalisation are disabled. Do
            not submit sensitive personal information through the form or chatbot.
          </p>
          {SENTRY_ENABLED ? (
            <p>
              Browser error reporting and screen replay start only after permission, and replays
              mask typed input and the chatbot conversation area. Server error logs are recorded
              regardless of consent to keep the service working, but only after removing
              credentials, cookies, request bodies, and visitor identifiers.
            </p>
          ) : null}
          {SENTRY_ENABLED ? (
            <p>
              To triage the severity of an error alert and suggest a fix, an error summary is sent
              once more to an AI provider. That summary is limited to the error title, type,
              message, code stack locations, deployment environment, and release. It excludes the
              visited URL, request headers, request bodies, screen replays, location, and visitor
              identifiers. The same fields and the verdict go to a Discord channel to alert the
              operator, and are recorded in this site&apos;s database.
            </p>
          ) : null}
          <p>
            See the official data terms from{" "}
            <a href={EXTERNAL_POLICY_URLS.web3Forms}>Web3Forms</a>,{" "}
            <a href={EXTERNAL_POLICY_URLS.googleAnalytics}>Google Analytics</a>,{" "}
            <a href={EXTERNAL_POLICY_URLS.openAi}>OpenAI API</a>,{" "}
            <a href={EXTERNAL_POLICY_URLS.gemini}>Gemini API</a>
            {SENTRY_ENABLED ? (
              <>
                , and <a href={EXTERNAL_POLICY_URLS.sentry}>Sentry</a>
              </>
            ) : null}{" "}
            for provider-specific details.
          </p>
        </>
      ),
    },
    {
      title: "Deletion, rights, and changes",
      content: (
        <>
          <p>
            Information controlled by the site is deleted without undue delay when its purpose
            ends or a valid deletion request is received. Browser storage can be deleted directly
            by the visitor. Information already transmitted to a provider follows that provider’s
            process and any legal retention duty.
          </p>
          <p>
            You will not be unfairly disadvantaged for exercising privacy rights. If services,
            purposes, or retention change, this document and its effective date will be updated
            together.
          </p>
        </>
      ),
    },
  ],
};

export { PRIVACY_EN };
