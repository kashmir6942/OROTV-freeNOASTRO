'use client'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* 1. Acceptance of Terms */}
        <section>
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-300 leading-relaxed">
            By accessing and using Light TV, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        {/* 2. Use License */}
        <section>
          <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Permission is granted to temporarily download one copy of the materials (information or software) on Light TV for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
          </p>
          <ul className="text-gray-300 leading-relaxed space-y-2 ml-4">
            <li>• Modifying or copying the materials</li>
            <li>• Using the materials for any commercial purpose or for any public display</li>
            <li>• Attempting to decompile or reverse engineer any software contained on Light TV</li>
            <li>• Removing any copyright or other proprietary notations from the materials</li>
            <li>• Transferring the materials to another person or "mirroring" the materials on any other server</li>
            <li>• Violating any applicable laws or regulations related to access to or use of Light TV</li>
          </ul>
        </section>

        {/* 3. Disclaimer */}
        <section>
          <h2 className="text-2xl font-bold mb-4">3. Disclaimer</h2>
          <p className="text-gray-300 leading-relaxed">
            The materials on Light TV are provided on an 'as is' basis. Light TV makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>
        </section>

        {/* 4. Limitations */}
        <section>
          <h2 className="text-2xl font-bold mb-4">4. Limitations</h2>
          <p className="text-gray-300 leading-relaxed">
            In no event shall Light TV or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Light TV, even if Light TV or a Light TV authorized representative has been notified orally or in writing of the possibility of such damage.
          </p>
        </section>

        {/* 5. Accuracy of Materials */}
        <section>
          <h2 className="text-2xl font-bold mb-4">5. Accuracy of Materials</h2>
          <p className="text-gray-300 leading-relaxed">
            The materials appearing on Light TV could include technical, typographical, or photographic errors. Light TV does not warrant that any of the materials on Light TV are accurate, complete, or current. Light TV may make changes to the materials contained on Light TV at any time without notice.
          </p>
        </section>

        {/* 6. Links */}
        <section>
          <h2 className="text-2xl font-bold mb-4">6. Links</h2>
          <p className="text-gray-300 leading-relaxed">
            Light TV has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Light TV of the site. Use of any such linked website is at the user's own risk.
          </p>
        </section>

        {/* 7. Modifications */}
        <section>
          <h2 className="text-2xl font-bold mb-4">7. Modifications</h2>
          <p className="text-gray-300 leading-relaxed">
            Light TV may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
          </p>
        </section>

        {/* 8. Governing Law */}
        <section>
          <h2 className="text-2xl font-bold mb-4">8. Governing Law</h2>
          <p className="text-gray-300 leading-relaxed">
            These terms and conditions of use are governed by and construed in accordance with the laws of the jurisdiction in which Light TV operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </p>
        </section>

        {/* 9. User Conduct */}
        <section>
          <h2 className="text-2xl font-bold mb-4">9. User Conduct</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            You agree not to use Light TV:
          </p>
          <ul className="text-gray-300 leading-relaxed space-y-2 ml-4">
            <li>• For any unlawful purposes or in violation of any applicable laws</li>
            <li>• To harass, abuse, or threaten other users</li>
            <li>• To transmit or procure the transmission of obscene, offensive, or indecent images</li>
            <li>• To disrupt the normal flow of dialogue within Light TV</li>
            <li>• To attempt to gain unauthorized access to systems or networks</li>
          </ul>
        </section>

        {/* 10. Account Suspension */}
        <section>
          <h2 className="text-2xl font-bold mb-4">10. Account Suspension</h2>
          <p className="text-gray-300 leading-relaxed">
            Light TV reserves the right to suspend or terminate your account and access to the service at any time, for any reason, without notice or liability. This includes, but is not limited to, violations of these Terms of Service.
          </p>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-800 pt-8 mt-8">
          <p className="text-gray-500 text-sm">
            If you have any questions about these Terms of Service, please contact us.
          </p>
        </div>
      </div>
    </div>
  )
}
