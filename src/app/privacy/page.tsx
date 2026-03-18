import Link from "next/link";
import { WaypointerLogo } from "@/components/brand/logo";

export const metadata = {
  title: "Privacy Policy | Waypointer",
  description: "Privacy Policy for Waypointer, the AI-powered career transition platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/" aria-label="Back to home">
            <WaypointerLogo size={28} variant="full" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-primary transition-colors duration-200"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Effective Date: March 18, 2026
        </p>

        <div className="mt-10 space-y-10 text-slate-700 leading-relaxed">
          {/* 1. Introduction & Scope */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              1. Introduction &amp; Scope
            </h2>
            <p>
              Waypointer (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is an AI-powered career
              transition platform. Employers purchase seat licenses on behalf of
              departing employees to provide personalized career support including
              resume optimization, job matching, interview preparation, and
              outreach assistance.
            </p>
            <p className="mt-3">
              This Privacy Policy describes how we collect, use, store, and
              protect your personal information when you use the Waypointer
              platform, website, and related services (collectively, the
              &quot;Service&quot;). It applies to all users of the Service, including
              employees who receive access through their employer and employers
              who administer seat licenses.
            </p>
            <p className="mt-3">
              By using the Service, you agree to the collection and use of
              information in accordance with this policy. If you do not agree
              with this policy, please do not use the Service.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              2. Information We Collect
            </h2>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              Account Information
            </h3>
            <p>
              When you create an account, we collect your name, email address,
              and authentication credentials. Employer administrators also
              provide company name and billing information.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              Career Data
            </h3>
            <p>
              To provide personalized career support, we collect information you
              provide including work history, job titles, skills, achievements,
              education, certifications, target roles, seniority level,
              management experience, industry preferences, and career goals.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              Uploaded Documents
            </h3>
            <p>
              You may upload resumes, LinkedIn profile data, and other
              career-related documents. These files are stored securely and used
              solely to provide the Service.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              AI-Generated Content
            </h3>
            <p>
              The Service generates tailored resumes, cover letters, LinkedIn
              profile rewrites, outreach messages, and interview preparation
              materials on your behalf. This generated content is stored in your
              account.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              Job Application &amp; Outreach Data
            </h3>
            <p>
              We store records of jobs you save, applications you track, outreach
              messages you compose, and your interaction with job listings.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              Interview Session Data
            </h3>
            <p>
              If you use our mock interview feature, we process voice data
              through our voice AI provider to conduct practice interviews. We
              store transcripts and feedback from these sessions.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              Usage Data
            </h3>
            <p>
              We automatically collect information about how you interact with
              the Service, including pages visited, features used, timestamps,
              browser type, device information, and IP address.
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              3. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1.5">
              <li>
                Provide, maintain, and improve the Service, including AI-powered
                resume optimization, job matching, interview preparation, and
                outreach assistance
              </li>
              <li>
                Process your career data through AI to generate personalized
                content tailored to your target roles and industries
              </li>
              <li>
                Match you with relevant job listings based on your skills,
                experience, and preferences
              </li>
              <li>
                Provide aggregated, anonymized analytics to your employer about
                overall program usage (never individual data)
              </li>
              <li>
                Send you transactional emails related to your account and Service
                usage
              </li>
              <li>
                Detect, prevent, and address technical issues and security
                threats
              </li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* 4. AI Processing Disclosure */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. AI Processing Disclosure
            </h2>
            <p>
              Waypointer uses artificial intelligence to generate career content
              on your behalf. When you use AI-powered features, relevant portions
              of your career data are sent to our AI provider, Anthropic, via
              their Claude API for processing.
            </p>
            <p className="mt-3">
              <strong>Important:</strong> Your data sent to Anthropic&apos;s
              Claude API is processed solely to generate your requested content.
              Per Anthropic&apos;s API data policy, data submitted through the
              API is not used to train or improve their AI models. Your career
              information is not retained by Anthropic after processing your
              request.
            </p>
            <p className="mt-3">
              AI processing is used for the following features: resume content
              extraction, resume generation and optimization, cover letter
              generation, LinkedIn profile rewrites, outreach message drafting,
              interview question generation, interview feedback, and career
              readiness scoring. All AI-generated content is reviewed and
              editable by you before use.
            </p>
          </section>

          {/* 5. Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              5. Data Sharing
            </h2>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              With Your Employer
            </h3>
            <p>
              Your employer, who purchased your Waypointer seat license, receives
              only aggregated, anonymized program metrics. These include overall
              activation rates, general feature usage statistics, and program-wide
              engagement trends.{" "}
              <strong>
                Your employer never has access to your individual career data,
                uploaded documents, AI-generated content, job applications,
                outreach messages, interview sessions, or any other personal
                information.
              </strong>{" "}
              This separation is enforced at the technical level through our
              database architecture and access controls.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              With Third-Party Service Providers
            </h3>
            <p>
              We share data with third-party providers solely to operate the
              Service (see Section 6). These providers are contractually
              obligated to use your data only for the purposes of providing their
              services to us and are bound by appropriate data protection
              obligations.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              We Do Not Sell Your Data
            </h3>
            <p>
              We do not sell, rent, or trade your personal information to third
              parties for marketing or advertising purposes.
            </p>

            <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2">
              Legal Requirements
            </h3>
            <p>
              We may disclose your information if required to do so by law or in
              response to valid legal process, such as a court order or subpoena.
            </p>
          </section>

          {/* 6. Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              6. Third-Party Services
            </h2>
            <p>
              The Service relies on the following third-party providers to
              operate. Each provider receives only the minimum data necessary to
              perform its function:
            </p>
            <ul className="mt-3 ml-6 list-disc space-y-2">
              <li>
                <strong>Anthropic (Claude API)</strong> &mdash; AI content
                generation. Receives career data relevant to the specific content
                being generated. Data is not used for model training.
              </li>
              <li>
                <strong>Supabase</strong> &mdash; Database hosting,
                authentication, and file storage. All user data is stored in
                Supabase infrastructure with row-level security enforced.
              </li>
              <li>
                <strong>Vercel</strong> &mdash; Application hosting and
                deployment. Processes web requests and serves the application.
              </li>
              <li>
                <strong>Resend</strong> &mdash; Transactional email delivery.
                Receives email addresses and message content for account-related
                communications sent from support@getwaypointer.com.
              </li>
              <li>
                <strong>OpenWeb Ninja (JSearch API)</strong> &mdash; Job listing
                data. We send job search queries (job titles, locations, keywords)
                to retrieve relevant listings. No personal career data is shared
                with this provider.
              </li>
              <li>
                <strong>ElevenLabs</strong> &mdash; Voice AI for mock interview
                practice sessions. Voice data is processed in real time to
                conduct practice interviews.
              </li>
            </ul>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. Data Security
            </h2>
            <p>
              We take the security of your data seriously and implement multiple
              layers of protection:
            </p>
            <ul className="mt-3 ml-6 list-disc space-y-1.5">
              <li>
                All data is transmitted over HTTPS with TLS encryption in transit
              </li>
              <li>
                Data at rest is encrypted using industry-standard encryption
                provided by our infrastructure providers
              </li>
              <li>
                Uploaded files (resumes, documents) are stored in private storage
                buckets and are never publicly accessible. Access is granted
                through time-limited presigned URLs that expire after one hour
              </li>
              <li>
                Row-level security (RLS) policies are enforced at the database
                level, ensuring that each user can only access their own data
              </li>
              <li>
                Authentication is handled through industry-standard protocols
                with secure session management
              </li>
              <li>
                Server-side API keys and secrets are never exposed to client-side
                code
              </li>
              <li>
                We conduct regular reviews of our security practices and update
                them as needed
              </li>
            </ul>
            <p className="mt-3">
              While we strive to protect your personal information, no method of
              transmission over the Internet or electronic storage is 100%
              secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* 8. Employer-Employee Data Separation */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              8. Employer-Employee Data Separation
            </h2>
            <p>
              A core principle of Waypointer is the strict separation between
              employer and employee data. This separation is fundamental to our
              platform design and is enforced at every level:
            </p>
            <ul className="mt-3 ml-6 list-disc space-y-1.5">
              <li>
                <strong>Employers cannot access individual employee data.</strong>{" "}
                The employer dashboard displays only aggregated, anonymized
                metrics about overall program engagement.
              </li>
              <li>
                Employers cannot see which specific employees have activated
                their accounts, what jobs they are applying to, what content they
                have generated, or any other individual activity.
              </li>
              <li>
                This data isolation is enforced at the database level through
                access control policies. It is not merely a user interface
                restriction but a technical enforcement built into our data
                architecture.
              </li>
              <li>
                Waypointer support staff access to individual data is limited to
                what is necessary for troubleshooting and is governed by internal
                access policies.
              </li>
            </ul>
          </section>

          {/* 9. Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              9. Data Retention
            </h2>
            <p>
              Your access to the Waypointer platform is active for 90 days from
              the date you activate your seat. During this period, you have full
              access to all features and your stored data.
            </p>
            <p className="mt-3">
              After your 90-day access period expires:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1.5">
              <li>
                Your account will transition to a read-only state. You will no
                longer be able to generate new content or use AI-powered
                features, but you may still access and download your existing
                data.
              </li>
              <li>
                We retain your data for a reasonable period after access expiry
                to allow you to retrieve your materials. After this retention
                period, your data will be securely deleted.
              </li>
              <li>
                You may request deletion of your data at any time by contacting
                us (see Section 15).
              </li>
            </ul>
            <p className="mt-3">
              Unused seat licenses that have not been activated expire 12 months
              from the date of purchase.
            </p>
          </section>

          {/* 10. Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              10. Your Rights
            </h2>
            <p>
              You have the following rights regarding your personal data:
            </p>
            <ul className="mt-3 ml-6 list-disc space-y-1.5">
              <li>
                <strong>Access:</strong> You can access your personal data at any
                time through your Waypointer account. You may also request a
                copy of all data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> You can update or correct your
                personal information through your account settings or by
                contacting us.
              </li>
              <li>
                <strong>Deletion:</strong> You can request that we delete your
                account and all associated data. We will process deletion
                requests within 30 days, subject to any legal retention
                requirements.
              </li>
              <li>
                <strong>Data Portability:</strong> You can export your career
                data, generated documents, and other content from the platform in
                standard formats (PDF, DOCX).
              </li>
              <li>
                <strong>Objection:</strong> You can object to certain types of
                processing of your data. If you object to AI processing, please
                note that this may limit the functionality available to you.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:support@getwaypointer.com"
                className="text-primary hover:underline"
              >
                support@getwaypointer.com
              </a>
              .
            </p>
          </section>

          {/* 11. Cookies & Tracking */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              11. Cookies &amp; Tracking
            </h2>
            <p>
              Waypointer uses cookies strictly for essential platform
              functionality:
            </p>
            <ul className="mt-3 ml-6 list-disc space-y-1.5">
              <li>
                <strong>Authentication cookies:</strong> Used to maintain your
                login session and keep you securely authenticated as you use the
                platform.
              </li>
              <li>
                <strong>Preference cookies:</strong> Used to remember your
                settings and preferences within the application.
              </li>
            </ul>
            <p className="mt-3">
              We do not use third-party advertising cookies, tracking pixels, or
              any form of cross-site tracking. We do not serve ads and do not
              share browsing data with advertising networks.
            </p>
          </section>

          {/* 12. Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              12. Children&apos;s Privacy
            </h2>
            <p>
              Waypointer is a professional career transition platform designed
              for adults in the workforce. The Service is not intended for
              individuals under the age of 18. We do not knowingly collect
              personal information from anyone under 18 years of age. If we
              become aware that we have collected data from someone under 18, we
              will take prompt steps to delete that information. If you believe a
              minor has provided us with personal data, please contact us at{" "}
              <a
                href="mailto:support@getwaypointer.com"
                className="text-primary hover:underline"
              >
                support@getwaypointer.com
              </a>
              .
            </p>
          </section>

          {/* 13. International Data Transfers */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              13. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than the country in which you reside. Our service providers,
              including our hosting, database, and AI processing providers,
              operate infrastructure in the United States and other
              jurisdictions.
            </p>
            <p className="mt-3">
              When we transfer data internationally, we ensure that appropriate
              safeguards are in place to protect your information in accordance
              with this Privacy Policy and applicable data protection laws.
            </p>
          </section>

          {/* 14. Changes to This Policy */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              14. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, legal requirements, or other
              factors. When we make material changes, we will notify you by
              posting the updated policy on this page with a revised effective
              date. For significant changes, we may also notify you via email.
            </p>
            <p className="mt-3">
              We encourage you to review this Privacy Policy periodically to stay
              informed about how we protect your data.
            </p>
          </section>

          {/* 15. Contact Us */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              15. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Waypointer Support</p>
              <p className="mt-1">
                Email:{" "}
                <a
                  href="mailto:support@getwaypointer.com"
                  className="text-primary hover:underline"
                >
                  support@getwaypointer.com
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-slate-200 pt-6 pb-12 flex items-center justify-between text-sm text-slate-400">
          <p>&copy; 2026 Waypointer. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-primary transition-colors duration-200">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors duration-200">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
