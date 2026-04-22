const Footer = () => {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-4 md:mb-0">
            MJNutraFit
          </div>
          <div className="text-sm text-muted-foreground">
            © 2026 MJNutraFit. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
