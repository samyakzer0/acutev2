import React from "react";
import { Github, Twitter, ExternalLink, Linkedin } from "lucide-react";

function Footer() {
  return (
    <footer className="footer glass-effect">
      <div className="footer-content">
        <h3>PhotoZapp</h3>
        <p>
          Secure, decentralized photo sharing powered by blockchain technology
        </p>

        <div className="footer-links">
          <a
            href="HTTPS://GITHUB.COM/samyakzer0"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github size={20} />
            <span>GitHub</span>
          </a>
          <a
            href="https://www.linkedin.com/in/samyakzer0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {" "}
            <Linkedin size={20} />
            <span>Linkedin</span>
          </a>
        </div>

        <p className="copyright">
          © {new Date().getFullYear()} PhotoChain. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
