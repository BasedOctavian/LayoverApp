import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";

export default function TOS() {
  const { theme } = React.useContext(ThemeContext);

  return (
    <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <ScrollView style={styles.container}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
              Wingman – End User License Agreement (EULA) & Terms of Use
            </Text>
            <Text style={[styles.date, { color: theme === "light" ? "#666666" : "#aaaaaa" }]}>
              Effective Date: 6/6/2026{'\n'}
              Last Updated: June 6, 2025
            </Text>

            <Section title="1. Acceptance of Terms" theme={theme}>
              By downloading, accessing, or using Wingman, you agree to this End User License Agreement (EULA) and our Privacy Policy. If you do not agree, do not use the app.
            </Section>

            <Section title="2. Eligibility" theme={theme}>
              You must be 18 years or older to use Wingman.{'\n\n'}
              By using the app, you confirm that:{'\n\n'}
              • You are at least 18 years old.{'\n'}
              • You are legally allowed to use the app under your local laws.{'\n'}
              • You are not impersonating another person or submitting false information.{'\n\n'}
              We reserve the right to suspend or terminate your access immediately if these conditions are violated.
            </Section>

            <Section title="3. Account Usage" theme={theme}>
              • You may only create one personal account.{'\n'}
              • You are fully responsible for all activity under your account.{'\n'}
              • Sharing accounts or credentials is strictly prohibited.
            </Section>

            <Section title="4. Zero-Tolerance Policy" theme={theme}>
              Wingman enforces a strict no-tolerance policy for the following:{'\n\n'}
              • Harassment, threats, stalking, or verbal abuse{'\n'}
              • Sexual content or unsolicited sexual advances{'\n'}
              • Hate speech, discrimination, or bullying{'\n'}
              • Misrepresentation of age, identity, or location{'\n'}
              • Spamming, scamming, or phishing attempts{'\n'}
              • Linking to third-party platforms for self-promotion or solicitation{'\n'}
              • Tampering with or falsifying GPS/location data{'\n\n'}
              Violations may result in an instant ban and user report to appropriate authorities.
            </Section>

            <Section title="5. Location Use" theme={theme}>
              Wingman relies on location services to show airport-specific content. You must:{'\n\n'}
              • Enable location access to use the app's core features{'\n'}
              • Not spoof, falsify, or manipulate your location{'\n'}
              • Not use the app for interactions outside intended airport zones
            </Section>

            <Section title="6. User Content" theme={theme}>
              You retain rights to content you post, but by uploading it to Wingman, you grant us a non-exclusive, royalty-free, worldwide license to use, share, and display it within the app.{'\n\n'}
              You may not post:{'\n\n'}
              • Any illegal or explicit material{'\n'}
              • Copyrighted material without permission{'\n'}
              • Content that misleads or endangers others{'\n\n'}
              We may remove or moderate content at our sole discretion.
            </Section>

            <Section title="7. Meetups, Events, and Chats" theme={theme}>
              Wingman allows users to match, message, and join public or private events.{'\n\n'}
              We are not responsible for:{'\n\n'}
              • In-person meetings or what happens during them{'\n'}
              • The accuracy or intent of user-generated events or chats{'\n'}
              • The behavior of other users, whether online or offline{'\n\n'}
              Always meet in public, well-lit places and use good judgment when engaging with strangers.
            </Section>

            <Section title="8. Termination" theme={theme}>
              We may suspend, limit, or terminate your access at any time if:{'\n\n'}
              • You breach these terms{'\n'}
              • You behave in a way that threatens user safety{'\n'}
              • You use the app for unintended or unlawful purposes
            </Section>

            <Section title="9. License Grant" theme={theme}>
              You are granted a limited, non-transferable, revocable license to use the app for personal, non-commercial use only.{'\n\n'}
              You may not:{'\n\n'}
              • Copy, modify, or reverse engineer the app{'\n'}
              • Use bots, scripts, or automated tools on the platform{'\n'}
              • Sell or redistribute Wingman or its data
            </Section>

            <Section title="10. Limitation of Liability" theme={theme}>
              Wingman is provided "as is" without warranties. We make no guarantees regarding:{'\n\n'}
              • Matches, events, or user conduct{'\n'}
              • Availability, uptime, or accuracy of content{'\n\n'}
              You use Wingman at your own risk.
            </Section>

            <Section title="11. Changes to Terms" theme={theme}>
              We may update this agreement at any time. Continued use of the app means you accept the updated terms.
            </Section>

            <Section title="12. Contact" theme={theme}>
              For questions, concerns, or to report abuse:{'\n'}
              matthewryan716@gmail.com{'\n\n'}
              By using Wingman, you agree to these Terms and certify you are 18 or older.
            </Section>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const Section = ({ title, children, theme }: { title: string; children: React.ReactNode; theme: string }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
      {title}
    </Text>
    <Text style={[styles.sectionContent, { color: theme === "light" ? "#333333" : "#cccccc" }]}>
      {children}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  date: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
}); 