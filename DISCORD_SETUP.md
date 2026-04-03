# Configuration Discord RPC pour Craftpick Launcher

Pour que l'intégration Discord fonctionne, vous devez suivre ces étapes:

## 1. Créer une Application Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur "New Application"
3. Donnez un nom à votre application (ex: "Craftpick Launcher")
4. Allez dans "Rich Presence"
5. Cliquez sur "Create Rich Presence"

## 2. Configurer l'Application

Dans la section "Rich Presence":
- **Description**: "Craftpick Launcher - Launcher Minecraft pour craftpick.fr"
- **Application ID**: Notez cet ID, il sera nécessaire

## 3. Ajouter des Images

Dans "Rich Presence" > "Art Assets":
- **Large Image**: 
  - Nom: `minecraft`
  - Image: Logo Minecraft ou image représentative
- **Small Image**: 
  - Nom: `craftpick` 
  - Image: Logo du launcher Craftpick

## 4. Mettre à jour le Code

Ouvrez le fichier `src/assets/js/utils/discordRPC.js` et remplacez:
```javascript
this.clientId = 'YOUR_DISCORD_APPLICATION_ID';
```

Par votre véritable Application ID Discord.

## 5. Fonctionnalités

L'intégration Discord affichera:
- **Quand Minecraft démarre**: "Joue à Minecraft sur [nom de l'instance]"
- **Pendant le téléchargement**: "Téléchargement X% sur [nom de l'instance]"
- **Pendant la vérification**: "Vérification X% sur [nom de l'instance]"
- **Pendant le patch**: "Patch en cours... sur [nom de l'instance]"
- **Quand Minecraft se ferme**: Le statut disparaît

## 6. Bouton Personnalisé

Un bouton "Site Craftpick" sera ajouté pour rediriger vers https://craftpick.fr

## Note

L'intégration ne fonctionnera que lorsque Discord est ouvert sur votre ordinateur.
