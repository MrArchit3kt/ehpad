export default function ApprovalRejectedPage() {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <div className="neon-card p-8 md:p-10 text-center">
            <span className="neon-badge">Demande refusée</span>
  
            <h1 className="neon-title neon-gradient-text mt-4 text-3xl font-black">
              Inscription refusée
            </h1>
  
            <p className="neon-text-muted mt-4 leading-7">
              Votre demande d’inscription a été refusée par un administrateur.
              Si besoin, contactez un admin pour plus d’informations.
            </p>
          </div>
        </div>
      </main>
    );
  }