import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WaypointerLogo } from "@/components/brand/logo";

export const metadata = {
  title: "Terms of Service | Waypointer",
  description:
    "Waypointer Terms of Service — the rules and guidelines for using our AI-powered career transition platform.",
};

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        {number}. {title}
      </h2>
      <div className="space-y-3 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="transition-opacity duration-200 hover:opacity-80">
            <WaypointerLogo size={32} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors duration-200 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500">
            Effective date: March 18, 2026
          </p>
        </div>

        <div className="space-y-10">
          {/* 1. Acceptance of Terms */}
          <Section id="acceptance" number={1} title="Acceptance of Terms">
            <p>
              By accessing or using Waypointer (&quot;the Service&quot;), you agree to be
              bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to
              these Terms, do not use the Service.
            </p>
            <p>
              These Terms apply to all users of the Service, including employers
              who purchase seat licenses and employees who receive access through
              their employer. By activating your account or using any feature of
              the platform, you confirm that you have read, understood, and
              accepted these Terms.
            </p>
            <p>
              We may update these Terms from time to time. If we make material
              changes, we will notify you by email or through the Service. Your
              continued use after such changes constitutes acceptance of the
              revised Terms.
            </p>
          </Section>

          {/* 2. Description of Service */}
          <Section id="service" number={2} title="Description of Service">
            <p>
              Waypointer is an AI-powered career transition platform. Employers
              purchase seat licenses to provide departing employees with
              structured support for their next career move.
            </p>
            <p>The platform provides employees with tools for:</p>
            <ul className="ml-6 list-disc space-y-1.5">
              <li>Career path targeting and role identification</li>
              <li>AI-assisted resume building and optimization</li>
              <li>LinkedIn profile optimization</li>
              <li>Job matching and search guidance</li>
              <li>Interview preparation with AI-powered practice sessions</li>
              <li>Outreach messaging and networking support</li>
              <li>Weekly action plans and progress tracking</li>
            </ul>
            <p>
              Waypointer uses artificial intelligence (powered by Anthropic&apos;s
              Claude) to generate personalized career content and
              recommendations. The Service is designed to assist and accelerate
              the job search process, not to replace professional career
              counseling or legal advice.
            </p>
          </Section>

          {/* 3. Account Registration & Access */}
          <Section
            id="accounts"
            number={3}
            title="Account Registration &amp; Access"
          >
            <p>
              <strong>Employer accounts.</strong> Employers register a company
              account and purchase seat licenses for employees. The employer is
              responsible for providing valid email addresses for invited
              employees and managing their seat allocations.
            </p>
            <p>
              <strong>Employee accounts.</strong> Employees receive an invitation
              email from Waypointer (not from the employer&apos;s domain) and
              activate their account by creating a password and completing their
              profile. Each seat license provides 90 days of full platform
              access from the date of activation.
            </p>
            <p>
              <strong>Seat activation.</strong> Unused seats that have not been
              activated expire 12 months from the date of purchase. Once
              activated, the 90-day access period begins and cannot be paused or
              extended.
            </p>
            <p>
              <strong>Account security.</strong> You are responsible for
              maintaining the confidentiality of your login credentials. You
              agree to notify us immediately if you become aware of any
              unauthorized use of your account.
            </p>
          </Section>

          {/* 4. User Responsibilities */}
          <Section
            id="responsibilities"
            number={4}
            title="User Responsibilities"
          >
            <p>When using Waypointer, you agree to:</p>
            <ul className="ml-6 list-disc space-y-1.5">
              <li>
                Provide accurate and truthful information about your work
                history, skills, and qualifications
              </li>
              <li>
                Use the Service only for legitimate career transition and job
                search purposes
              </li>
              <li>
                Not share your account credentials with others or allow
                unauthorized access to your account
              </li>
              <li>
                Not attempt to reverse-engineer, decompile, or extract the
                underlying algorithms or AI models
              </li>
              <li>
                Not use the Service to generate misleading, fraudulent, or
                deceptive content
              </li>
              <li>
                Not use automated tools, bots, or scripts to access the Service
                beyond normal usage
              </li>
              <li>
                Review and verify all AI-generated content before using it in
                applications or professional settings
              </li>
            </ul>
          </Section>

          {/* 5. AI-Generated Content Disclaimer */}
          <Section
            id="ai-content"
            number={5}
            title="AI-Generated Content Disclaimer"
          >
            <p>
              Waypointer uses artificial intelligence to generate resumes, cover
              letters, LinkedIn content, outreach messages, interview responses,
              and career recommendations. While we strive for high-quality,
              relevant output, you should understand the following:
            </p>
            <ul className="ml-6 list-disc space-y-1.5">
              <li>
                <strong>Not professional advice.</strong> AI-generated content
                does not constitute professional career counseling, legal advice,
                or employment guidance. It is a tool to assist your job search,
                not a substitute for professional judgment.
              </li>
              <li>
                <strong>Review before use.</strong> You are responsible for
                reviewing, editing, and verifying all AI-generated content before
                submitting it to prospective employers or publishing it on any
                platform. You should ensure it accurately represents your
                experience and qualifications.
              </li>
              <li>
                <strong>No guarantees.</strong> We do not guarantee that
                AI-generated content will result in job interviews, offers, or
                employment. Outcomes depend on many factors beyond the scope of
                this Service.
              </li>
              <li>
                <strong>Potential inaccuracies.</strong> AI-generated content may
                occasionally contain errors, omissions, or suggestions that do
                not fully align with your experience. Always verify factual
                claims before using generated content.
              </li>
            </ul>
          </Section>

          {/* 6. Intellectual Property */}
          <Section
            id="intellectual-property"
            number={6}
            title="Intellectual Property"
          >
            <p>
              <strong>Your content.</strong> You retain ownership of all personal
              information, work history, and career data you provide to the
              Service. You also own the final versions of resumes, cover letters,
              and other documents you create using the platform, including any
              edits you make to AI-generated drafts.
            </p>
            <p>
              <strong>License to Waypointer.</strong> By using the Service, you
              grant Waypointer a limited, non-exclusive license to process your
              content as necessary to provide the Service (for example, to
              generate AI-powered recommendations and documents). We will not
              sell your content or use it for purposes unrelated to providing the
              Service.
            </p>
            <p>
              <strong>Platform ownership.</strong> Waypointer and its licensors
              own all rights in the platform, including its design, code, AI
              models, prompt templates, algorithms, branding, and documentation.
              Nothing in these Terms grants you ownership of any part of the
              platform itself.
            </p>
          </Section>

          {/* 7. Data Privacy */}
          <Section id="privacy" number={7} title="Data Privacy">
            <p>
              Your privacy is important to us. Our collection, use, and
              protection of your personal data is governed by our{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-2 transition-colors duration-200 hover:text-primary/80"
              >
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
            <p>
              Key points relevant to these Terms:
            </p>
            <ul className="ml-6 list-disc space-y-1.5">
              <li>
                We store your career data, resumes, and application history
                securely using industry-standard encryption and access controls
              </li>
              <li>
                All files are stored privately with time-limited access links
              </li>
              <li>
                We use your data to provide and improve the Service, not to sell
                to third parties
              </li>
              <li>
                AI-generated content is processed through Anthropic&apos;s Claude API;
                your data is handled in accordance with our data processing
                agreements with our AI providers
              </li>
            </ul>
          </Section>

          {/* 8. Employer vs Employee Data Separation */}
          <Section
            id="data-separation"
            number={8}
            title="Employer &amp; Employee Data Separation"
          >
            <p>
              Waypointer maintains strict separation between employer and
              employee data:
            </p>
            <ul className="ml-6 list-disc space-y-1.5">
              <li>
                <strong>Employers</strong> can view aggregated, anonymized
                metrics about their program (such as overall activation rates,
                average engagement, and milestone completion percentages).
                Employers never have access to individual employee resumes, job
                applications, career targets, or personal activity data.
              </li>
              <li>
                <strong>Employees</strong> have full access to their own data,
                generated content, and progress. Employee data is isolated at the
                database level and cannot be accessed by other employees or by
                the sponsoring employer.
              </li>
            </ul>
            <p>
              This separation is enforced at every layer of the platform,
              including the database, API, and user interface. It is a core
              design principle, not a configurable setting.
            </p>
          </Section>

          {/* 9. Payment Terms */}
          <Section id="payments" number={9} title="Payment Terms">
            <p>
              <strong>Seat-based pricing.</strong> Employers purchase seat
              licenses on a per-seat basis. Pricing varies based on volume, with
              discounts available for larger purchases. Current pricing is
              available on our website or by contacting our sales team.
            </p>
            <p>
              <strong>Payment.</strong> Payment is due at the time of purchase.
              All prices are listed in US dollars unless otherwise specified.
            </p>
            <p>
              <strong>Refunds.</strong> Activated seats are non-refundable, as
              the employee has already begun using the Service. Unactivated seats
              may be eligible for a refund at Waypointer&apos;s discretion, provided
              the request is made before the seat is assigned to an employee.
            </p>
            <p>
              <strong>Seat expiration.</strong> Purchased seats that remain
              unactivated expire 12 months from the purchase date. Expired,
              unactivated seats are not eligible for refunds.
            </p>
          </Section>

          {/* 10. Service Availability & Modifications */}
          <Section
            id="availability"
            number={10}
            title="Service Availability &amp; Modifications"
          >
            <p>
              We aim to keep Waypointer available and reliable, but we do not
              guarantee uninterrupted access. The Service may be temporarily
              unavailable due to maintenance, updates, or circumstances beyond
              our control.
            </p>
            <p>
              We reserve the right to modify, update, or discontinue features of
              the Service at any time. If we make changes that materially reduce
              the functionality available to active users, we will provide
              reasonable notice.
            </p>
            <p>
              AI model capabilities and outputs may change over time as
              underlying models are updated. We continuously work to improve
              output quality but cannot guarantee that results will remain
              identical across model updates.
            </p>
          </Section>

          {/* 11. Limitation of Liability */}
          <Section
            id="liability"
            number={11}
            title="Limitation of Liability"
          >
            <p>
              To the maximum extent permitted by applicable law, Waypointer and
              its officers, directors, employees, and agents shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages arising from or related to your use of the Service.
            </p>
            <p>
              This includes, without limitation, damages for lost profits, lost
              data, loss of employment opportunities, or any outcomes resulting
              from reliance on AI-generated content.
            </p>
            <p>
              Our total cumulative liability for all claims arising from or
              related to the Service shall not exceed the amount paid by you (or
              your employer on your behalf) for the seat license during the 12
              months preceding the claim.
            </p>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, whether express or implied, including but
              not limited to warranties of merchantability, fitness for a
              particular purpose, or non-infringement.
            </p>
          </Section>

          {/* 12. Termination */}
          <Section id="termination" number={12} title="Termination">
            <p>
              <strong>By you.</strong> You may stop using the Service at any
              time. Employees may request account deletion by contacting support.
              Employers may deactivate their company account, though this does
              not terminate active employee seats before their 90-day period
              ends.
            </p>
            <p>
              <strong>By Waypointer.</strong> We may suspend or terminate your
              access if you violate these Terms, engage in fraudulent activity,
              or use the Service in a manner that harms other users or the
              platform. We will make reasonable efforts to notify you before
              termination, except in cases of severe violations.
            </p>
            <p>
              <strong>Effect of termination.</strong> Upon termination, your
              right to access the Service ends. We may retain your data for a
              reasonable period to comply with legal obligations, resolve
              disputes, and enforce our agreements. You may request export of
              your data before termination takes effect.
            </p>
          </Section>

          {/* 13. Governing Law */}
          <Section id="governing-law" number={13} title="Governing Law">
            <p>
              These Terms are governed by and construed in accordance with the
              laws of the State of Delaware, United States, without regard to
              conflict of law principles.
            </p>
            <p>
              Any disputes arising from these Terms or your use of the Service
              shall be resolved through binding arbitration in accordance with
              the rules of the American Arbitration Association, unless you are
              entitled to bring a claim in small claims court. You agree to waive
              any right to participate in a class action lawsuit or class-wide
              arbitration.
            </p>
          </Section>

          {/* 14. Contact Information */}
          <Section id="contact" number={14} title="Contact Information">
            <p>
              If you have questions about these Terms or need to report an issue,
              please contact us:
            </p>
            <div className="mt-2 rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">Waypointer Support</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:support@getwaypointer.com"
                  className="font-medium text-primary underline underline-offset-2 transition-colors duration-200 hover:text-primary/80"
                >
                  support@getwaypointer.com
                </a>
              </p>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
          <p>&copy; 2026 Waypointer. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
