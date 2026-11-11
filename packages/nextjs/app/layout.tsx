import { Montserrat } from "next/font/google";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { VaulticAppWithProviders } from "~~/components/VaulticAppWithProviders";
import "~~/styles/globals.css";
import { getMetadata, validateEnv } from "~~/utils/vaultic";

validateEnv();

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = getMetadata({
  title: "VTrust Africa",
  description:
    "Tokenize and invest in real-world assets on Stellar. RWA platform for Rwanda and Africa with on-chain registration and KYC.",
});

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning className={montserrat.variable}>
      <body className={`${montserrat.className} font-sans`}>
        <ThemeProvider enableSystem>
          <VaulticAppWithProviders>{children}</VaulticAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
