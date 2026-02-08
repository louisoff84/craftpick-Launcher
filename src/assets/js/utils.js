/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

const { ipcRenderer } = require('electron')
const { Status } = require('minecraft-java-core')
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

import config from './utils/config.js';
import database from './utils/database.js';
import logger from './utils/logger.js';
import popup from './utils/popup.js';
import { skin2D } from './utils/skin.js';
import slider from './utils/slider.js';

async function setBackground(theme) {
    let databaseLauncher = new database();
    let configClient = await databaseLauncher.readData('configClient');
    let backgroundConfig = configClient?.launcher_config?.background || 'random';
    let customPath = configClient?.launcher_config?.background_custom_path;

    if (typeof theme == 'undefined') {
        theme = configClient?.launcher_config?.theme || "auto";
        theme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res);
    }

    const isDark = theme;
    const themeFolder = isDark ? 'dark' : 'light';
    const basePath = `${__dirname}/assets/images/background`;
    let background = null;

    let body = document.body;
    body.className = isDark ? 'dark global' : 'light global';

    // Mode "aucun" : fond uni
    if (backgroundConfig === 'none') {
        body.style.backgroundImage = 'none';
        body.style.backgroundColor = isDark ? '#292929' : 'rgb(245, 245, 245)';
        body.style.backgroundSize = 'cover';
        return;
    }

    // Image personnalisée
    if (backgroundConfig === 'custom' && customPath && fs.existsSync(customPath)) {
        const fileUrl = 'file:///' + path.normalize(customPath).replace(/\\/g, '/').replace(/^\/+/, '');
        background = `linear-gradient(#00000080, #00000080), url(${fileUrl})`;
    }
    // Fond intégré spécifique (1.png, 2.png, etc.)
    else if (backgroundConfig && backgroundConfig !== 'random') {
        const filePath = `${basePath}/${themeFolder}/${backgroundConfig}`;
        if (fs.existsSync(filePath)) {
            background = `linear-gradient(#00000080, #00000080), url(./assets/images/background/${themeFolder}/${backgroundConfig})`;
        }
    }

    // Mode aléatoire ou fallback
    if (!background) {
        if (fs.existsSync(`${basePath}/easterEgg`) && Math.random() < 0.005) {
            const easterEggs = fs.readdirSync(`${basePath}/easterEgg`);
            const file = easterEggs[Math.floor(Math.random() * easterEggs.length)];
            background = `url(./assets/images/background/easterEgg/${file})`;
        } else if (fs.existsSync(`${basePath}/${themeFolder}`)) {
            const backgrounds = fs.readdirSync(`${basePath}/${themeFolder}`);
            const file = backgrounds[Math.floor(Math.random() * backgrounds.length)];
            background = `linear-gradient(#00000080, #00000080), url(./assets/images/background/${themeFolder}/${file})`;
        }
    }

    body.style.backgroundImage = background || 'none';
    body.style.backgroundColor = background ? 'transparent' : (isDark ? '#000' : '#fff');
    body.style.backgroundSize = 'cover';
}

/**
 * Retourne la liste fusionnée des instances (distantes + personnalisées)
 */
async function getMergedInstanceList(db) {
    const remote = await config.getInstanceList().catch(() => []);
    const configClient = await db.readData('configClient') || {};
    const custom = configClient.custom_instances || [];
    return [...remote, ...custom];
}

/**
 * Structure minimale d'une instance personnalisée
 */
function createCustomInstance(data) {
    return {
        name: data.name,
        isCustom: true,
        url: data.url || null,
        loadder: {
            minecraft_version: data.minecraft_version || 'latest_release',
            loadder_type: data.loader_type || 'none',
            loadder_version: data.loader_version || 'latest'
        },
        verify: false,
        ignored: ['config', 'logs', 'resourcepacks', 'options.txt', 'optionsof.txt'],
        status: {
            ip: data.server_ip || 'localhost',
            port: data.server_port || 25565,
            nameServer: data.server_name || data.name
        },
        whitelistActive: false,
        whitelist: [],
        jvm_args: data.jvm_args || [],
        game_args: data.game_args || []
    };
}

/**
 * Retourne la liste des arrière-plans disponibles (dark ou light)
 */
function getAvailableBackgrounds(theme) {
    const isDark = theme;
    const themeFolder = isDark ? 'dark' : 'light';
    const basePath = `${__dirname}/assets/images/background/${themeFolder}`;
    if (!fs.existsSync(basePath)) return [];
    return fs.readdirSync(basePath).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
}

async function changePanel(id) {
    let panel = document.querySelector(`.${id}`);
    let active = document.querySelector(`.active`)
    if (active) active.classList.toggle("active");
    panel.classList.add("active");
}

async function appdata() {
    return await ipcRenderer.invoke('appData').then(path => path)
}

async function addAccount(data) {
    let skin = false
    if (data?.profile?.skins[0]?.base64) skin = await new skin2D().creatHeadTexture(data.profile.skins[0].base64);
    let div = document.createElement("div");
    div.classList.add("account");
    div.id = data.ID;
    div.innerHTML = `
        <div class="profile-image" ${skin ? 'style="background-image: url(' + skin + ');"' : ''}></div>
        <div class="profile-infos">
            <div class="profile-pseudo">${data.name}</div>
            <div class="profile-uuid">${data.uuid}</div>
        </div>
        <div class="delete-profile" id="${data.ID}">
            <div class="icon-account-delete delete-profile-icon"></div>
        </div>
    `
    return document.querySelector('.accounts-list').appendChild(div);
}

async function accountSelect(data) {
    let account = document.getElementById(`${data.ID}`);
    let activeAccount = document.querySelector('.account-select')

    if (activeAccount) activeAccount.classList.toggle('account-select');
    account.classList.add('account-select');
    if (data?.profile?.skins[0]?.base64) headplayer(data.profile.skins[0].base64);
}

async function headplayer(skinBase64) {
    let skin = await new skin2D().creatHeadTexture(skinBase64);
    document.querySelector(".player-head").style.backgroundImage = `url(${skin})`;
}

async function setStatus(opt) {
    let nameServerElement = document.querySelector('.server-status-name')
    let statusServerElement = document.querySelector('.server-status-text')
    let playersOnline = document.querySelector('.status-player-count .player-count')

    if (!opt) {
        statusServerElement.classList.add('red')
        statusServerElement.innerHTML = `Ferme - 0 ms`
        document.querySelector('.status-player-count').classList.add('red')
        playersOnline.innerHTML = '0'
        return
    }

    let { ip, port, nameServer } = opt
    nameServerElement.innerHTML = nameServer
    let status = new Status(ip, port);
    let statusServer = await status.getStatus().then(res => res).catch(err => err);

    if (!statusServer.error) {
        statusServerElement.classList.remove('red')
        document.querySelector('.status-player-count').classList.remove('red')
        statusServerElement.innerHTML = `En ligne - ${statusServer.ms} ms`
        playersOnline.innerHTML = statusServer.playersConnect
    } else {
        statusServerElement.classList.add('red')
        statusServerElement.innerHTML = `Ferme - 0 ms`
        document.querySelector('.status-player-count').classList.add('red')
        playersOnline.innerHTML = '0'
    }
}


export {
    appdata as appdata,
    changePanel as changePanel,
    config as config,
    database as database,
    logger as logger,
    popup as popup,
    setBackground as setBackground,
    getAvailableBackgrounds as getAvailableBackgrounds,
    getMergedInstanceList as getMergedInstanceList,
    createCustomInstance as createCustomInstance,
    skin2D as skin2D,
    addAccount as addAccount,
    accountSelect as accountSelect,
    slider as Slider,
    pkg as pkg,
    setStatus as setStatus
}