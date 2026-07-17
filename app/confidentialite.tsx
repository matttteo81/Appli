import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ThemedText } from '../src/components/ui';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/typography';

const CONTACT = 'matttteo81@gmail.com';
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
          Fil est une application privée conçue pour un couple. Nous prenons ta vie privée
          très au sérieux : tes données servent uniquement à faire fonctionner l’app entre
          toi et ta moitié. Elles ne sont ni vendues, ni utilisées à des fins publicitaires.
        </P>

        <H>Les données que nous utilisons</H>
        <P>• Compte : ton adresse e-mail et ton nom d’affichage, pour te connecter.</P>
        <P>
          • Profil : la ville que tu choisis (et ses coordonnées) pour calculer la distance,
          la météo et le fuseau horaire ; ton humeur et ton avatar ; un jeton de notification
          pour t’envoyer les alertes.
        </P>
        <P>
          • Contenu que tu partages avec ta moitié : photos (y compris leur lieu si la photo
          en contient un), messages, petits mots, souvenirs, dates, événements et réponses
          aux jeux.
        </P>

        <H>À quoi elles servent</H>
        <P>
          Uniquement à faire vivre l’app : afficher vos informations à l’autre, envoyer les
          notifications, calculer la distance et la météo, et situer vos souvenirs sur la carte.
        </P>

        <H>Avec qui elles sont partagées</H>
        <P>
          Seulement avec la personne à qui tu es appairé(e) dans Fil. Personne d’autre n’y a
          accès. Nous ne revendons aucune donnée et n’affichons aucune publicité.
        </P>

        <H>Où elles sont stockées</H>
        <P>
          Tes données sont hébergées de façon sécurisée par notre prestataire technique
          (Supabase), avec un accès restreint : chaque couple ne peut voir que ses propres
          données.
        </P>

        <H>La localisation</H>
        <P>
          La position sert seulement à afficher ta ville, la distance, la météo et le lieu des
          photos. Fil ne suit jamais ta position en arrière-plan.
        </P>

        <H>Conserver et supprimer</H>
        <P>
          Tes données sont conservées tant que ton compte existe. Tu peux supprimer ton compte
          à tout moment depuis Paramètres → « Supprimer mon compte » : ton profil et tes
          contenus sont alors effacés définitivement. Ta moitié conserve son propre compte.
        </P>

        <H>Enfants</H>
        <P>
          Fil n’est pas destinée aux personnes de moins de 13 ans.
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
