import { Montserrat } from "next/font/google";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { VaulticAppWithProviders } from "~~/components/VaulticAppWithProviders";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/vaultic/getMetadata";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = getMetadata({
  title: "Vaultic Trust",
  description:
    "Tokenize and invest in real-world assets on Stellar. RWA platform for Rwanda and Africa with on-chain registration and KYC.",
});

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <body className={`${montserrat.className} font-sans antialiased`}>
        <ThemeProvider enableSystem>
          <VaulticAppWithProviders>{children}</VaulticAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
