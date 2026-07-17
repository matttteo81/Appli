import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/typography';

const CONTACT = 'support.application1@gmail.com';
const UPDATED = '17 juillet 2026';

function P({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText variant="body" color={colors.texteSombre} style={{ marginTop: spacing.sm, lineHeight: 23 }}>
      {children}
    </ThemedText>
  );
}
function H({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText variant="title" style={{ marginTop: spacing.xl }}>
      {children}
    </ThemedText>
  );
}

export default function Confidentialite() {
  const router = useRouter();
  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText variant="bodyMedium" color={colors.corail}>‹ Retour</ThemedText>
        </Pressable>
        <ThemedText variant="title">Confidentialité</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
        <ThemedText variant="body" color={colors.texteGris}>Dernière mise à jour : {UPDATED}</ThemedText>

        <P>
          Lingo est une application d’échange linguistique. Nous prenons ta vie privée très au
          sérieux : tes données servent uniquement à te mettre en relation avec des partenaires
          de langue et à faire fonctionner l’app. Elles ne sont ni vendues, ni utilisées à des
          fins publicitaires.
        </P>

        <H>Les données que nous utilisons</H>
        <P>• Compte : ton adresse e-mail et ton pseudo, pour te connecter.</P>
        <P>
          • Profil : tes langues (parlées et apprises), ton niveau, ta bio, ton avatar, tes
          centres d’intérêt, ainsi que ta position approximative (ville, coordonnées) pour te
          proposer des partenaires proches et calculer la distance. Un jeton de notification
          sert à t’avertir des nouveaux messages.
        </P>
        <P>
          • Contenu que tu partages : messages texte et vocaux échangés avec tes partenaires,
          corrections, et ta participation aux salons vocaux.
        </P>

        <H>À quoi elles servent</H>
        <P>
          Uniquement à faire vivre l’app : afficher ton profil aux autres apprenants, te
          proposer des partenaires pertinents près de toi, acheminer tes messages et animer les
          salons de pratique orale.
        </P>

        <H>Avec qui elles sont partagées</H>
        <P>
          Ton profil (pseudo, langues, ville, intérêts) est visible par les autres membres pour
          permettre la mise en relation. Tes conversations privées ne sont visibles que par toi
          et ton interlocuteur. Nous ne revendons aucune donnée et n’affichons aucune publicité.
        </P>

        <H>Où elles sont stockées</H>
        <P>
          Tes données sont hébergées de façon sécurisée par notre prestataire technique
          (Supabase), avec un accès restreint : tes conversations privées ne sont accessibles
          qu’à leurs participants.
        </P>

        <H>La localisation</H>
        <P>
          La position sert seulement à afficher ta ville et la distance avec d’éventuels
          partenaires. Lingo ne suit jamais ta position en arrière-plan.
        </P>

        <H>Conserver et supprimer</H>
        <P>
          Tes données sont conservées tant que ton compte existe. Tu peux supprimer ton compte
          à tout moment depuis Profil → « Supprimer mon compte » : ton profil, tes messages et
          tes salons sont alors effacés définitivement.
        </P>

        <H>Enfants</H>
        <P>
          Lingo n’est pas destinée aux personnes de moins de 13 ans.
        </P>

        <H>Nous contacter</H>
        <P>
          Pour toute question sur tes données : {CONTACT}
        </P>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
