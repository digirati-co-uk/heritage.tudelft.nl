import { getTranslations } from "next-intl/server";
import { SocialIcon } from "react-social-icons";

import "react-social-icons/twitter";

export async function GlobalFooter() {
  const t = await getTranslations();

  return (
    <footer className="mt-8 w-full bg-[#1D1F71] p-8 text-white">
      <div className="mx-auto flex max-w-screen-xl flex-col justify-between sm:flex-row ">
        <div>
          <h2 className="mb-12 max-w-96 font-sans text-4xl">TU Delft Library</h2>
          <div className="mb-8 flex gap-2 max-sm:flex-wrap max-sm:gap-1">
            {/* <div>
              <SocialIcon url="https://www.facebook.com/tudelft" bgColor="#fff" color="#000" fgColor="#1D1F71" />
            </div> */}
            <div>
              <SocialIcon network="x" url="http://twitter.com/tudelftlibrary" bgColor="#fff" color="#000" fgColor="#1D1F71" />
            </div>
            <div>
              <SocialIcon url="https://www.instagram.com/tudelftlibrary/" bgColor="#fff" color="#000" fgColor="#1D1F71" />
            </div>
            <div>
              <SocialIcon url="https://www.youtube.com/user/TUDelftLibraryMC" bgColor="#fff" color="#000" fgColor="#1D1F71" />
            </div>
            <div>
              <SocialIcon
                url="https://www.linkedin.com/company/tu-delft-library"
                bgColor="#fff"
                color="#000"
                fgColor="#1D1F71"
              />
            </div>
            <div>
              <SocialIcon
                network="whatsapp"
                url="https://wa.me/31642190721"
                bgColor="#fff"
                color="#000"
                fgColor="#1D1F71"
              />
            </div>
          </div>
        </div>

        <div className="text-lg">
          <address className="not-italic">
            <div>Prometheusplein 1</div>
            <div>2628 ZC  Delft</div>
            <div>The Netherlands</div>
          </address>
          <div>
            <a
              className="underline"
              href="https://www.tudelft.nl/library/over-de-library/contact-en-bereikbaarheid"
              target="_blank"
              rel="noreferrer"
            >
              {t("Contact and accessibility")}
            </a>
          </div>
        </div>

        <div>{/* Space for links. */}</div>
      </div>
    </footer>
  );
}
