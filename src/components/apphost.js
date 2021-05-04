import { version as appVersion } from '../../package.json';
import appSettings from '../scripts/settings/appSettings';
import browser from '../scripts/browser';
import { Events } from 'jellyfin-apiclient';
import * as htmlMediaHelper from '../components/htmlMediaHelper';
import * as webSettings from '../scripts/settings/webSettings';
import globalize from '../scripts/globalize';
import profileBuilder from '../scripts/browserDeviceProfile';

const appName = 'Jellyfin Web';

function getBaseProfileOptions(item) {
    const disableHlsVideoAudioCodecs = [];

    if (item && htmlMediaHelper.enableHlsJsPlayer(item.RunTimeTicks, item.MediaType)) {
        if (browser.edge) {
            disableHlsVideoAudioCodecs.push('mp3');
        }

        disableHlsVideoAudioCodecs.push('ac3');
        disableHlsVideoAudioCodecs.push('eac3');
        disableHlsVideoAudioCodecs.push('opus');
    }

    return {
        enableMkvProgressive: false,
        disableHlsVideoAudioCodecs: disableHlsVideoAudioCodecs
    };
}

function getDeviceProfile(item) {
    return new Promise(function (resolve) {
        let profile;

        if (window.NativeShell) {
            profile = window.NativeShell.AppHost.getDeviceProfile(profileBuilder, appVersion);
        } else {
            const builderOpts = getBaseProfileOptions(item);
            profile = profileBuilder(builderOpts);
        }

        resolve(profile);
    });
}

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
}

function replaceAll(originalString, strReplace, strWith) {
    const strReplace2 = escapeRegExp(strReplace);
    const reg = new RegExp(strReplace2, 'ig');
    return originalString.replace(reg, strWith);
}

function generateDeviceId() {
    const keys = [];

    if (keys.push(navigator.userAgent), keys.push(new Date().getTime()), window.btoa) {
        const result = replaceAll(btoa(keys.join('|')), '=', '1');
        return result;
    }

    return new Date().getTime();
}

function getDeviceId() {
    if (!deviceId) {
        const key = '_deviceId2';

        deviceId = appSettings.get(key);

        if (!deviceId) {
            deviceId = generateDeviceId();
            appSettings.set(key, deviceId);
        }
    }

    return deviceId;
}

function getDeviceName() {
    if (!deviceName) {
        if (browser.tizen) {
            deviceName = 'Samsung Smart TV';
        } else if (browser.web0s) {
            deviceName = 'LG Smart TV';
        } else if (browser.operaTv) {
            deviceName = 'Opera TV';
        } else if (browser.xboxOne) {
            deviceName = 'Xbox One';
        } else if (browser.ps4) {
            deviceName = 'Sony PS4';
        } else if (browser.chrome) {
            deviceName = 'Chrome';
        } else if (browser.edgeChromium) {
            deviceName = 'Edge Chromium';
        } else if (browser.edge) {
            deviceName = 'Edge';
        } else if (browser.firefox) {
            deviceName = 'Firefox';
        } else if (browser.opera) {
            deviceName = 'Opera';
        } else if (browser.safari) {
            deviceName = 'Safari';
        } else {
            deviceName = 'Web Browser';
        }

        if (browser.ipad) {
            deviceName += ' iPad';
        } else if (browser.iphone) {
            deviceName += ' iPhone';
        } else if (browser.android) {
            deviceName += ' Android';
        }
    }

    return deviceName;
}

function supportsVoiceInput() {
    if (!browser.tv) {
        return window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.oSpeechRecognition || window.msSpeechRecognition;
    }

    return false;
}

function supportsFullscreen() {
    if (browser.tv) {
        return false;
    }

    const element = document.documentElement;
    return (element.requestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen || element.msRequestFullscreen) || document.createElement('video').webkitEnterFullscreen;
}

function getDefaultLayout() {
    return 'desktop';
}

function supportsHtmlMediaAutoplay() {
    if (browser.edgeUwp || browser.tizen || browser.web0s || browser.orsay || browser.operaTv || browser.ps4 || browser.xboxOne) {
        return true;
    }

    if (browser.mobile) {
        return false;
    }

    return true;
}

function supportsCue() {
    try {
        const video = document.createElement('video');
        const style = document.createElement('style');

        style.textContent = 'video::cue {background: inherit}';
        document.body.appendChild(style);
        document.body.appendChild(video);

        const cue = window.getComputedStyle(video, '::cue').background;
        document.body.removeChild(style);
        document.body.removeChild(video);

        return !!cue.length;
    } catch (err) {
        console.error('error detecting cue support: ' + err);
        return false;
    }
}

function onAppVisible() {
    if (isHidden) {
        isHidden = false;
        Events.trigger(appHost, 'resume');
    }
}

function onAppHidden() {
    if (!isHidden) {
        isHidden = true;
    }
}

const supportedFeatures = function () {
    const features = [];

    if (navigator.share) {
        features.push('sharing');
    }

    if (!browser.edgeUwp && !browser.tv && !browser.xboxOne && !browser.ps4) {
        features.push('filedownload');
    }

    if (browser.operaTv || browser.tizen || browser.orsay || browser.web0s) {
        features.push('exit');
    } else {
        features.push('exitmenu');
        features.push('plugins');
    }

    if (!browser.operaTv && !browser.tizen && !browser.orsay && !browser.web0s && !browser.ps4) {
        features.push('externallinks');
        features.push('externalpremium');
    }

    if (!browser.operaTv) {
        features.push('externallinkdisplay');
    }

    if (supportsVoiceInput()) {
        features.push('voiceinput');
    }

    if (supportsHtmlMediaAutoplay()) {
        features.push('htmlaudioautoplay');
        features.push('htmlvideoautoplay');
    }

    if (browser.edgeUwp) {
        features.push('sync');
    }

    if (supportsFullscreen()) {
        features.push('fullscreenchange');
    }

    if (browser.tv || browser.xboxOne || browser.ps4 || browser.mobile) {
        features.push('physicalvolumecontrol');
    }

    if (!browser.tv && !browser.xboxOne && !browser.ps4) {
        features.push('remotecontrol');
    }

    if (!browser.operaTv && !browser.tizen && !browser.orsay && !browser.web0s && !browser.edgeUwp) {
        features.push('remotevideo');
    }

    features.push('displaylanguage');
    features.push('otherapppromotions');
    features.push('displaymode');
    features.push('targetblank');
    features.push('screensaver');

    webSettings.getMultiServer().then(enabled => {
        if (enabled) features.push('multiserver');
    });

    if (!browser.orsay && (browser.firefox || browser.ps4 || browser.edge || supportsCue())) {
        features.push('subtitleappearancesettings');
    }

    if (!browser.orsay) {
        features.push('subtitleburnsettings');
    }

    if (!browser.tv && !browser.ps4 && !browser.xboxOne) {
        features.push('fileinput');
    }

    if (browser.chrome || browser.edgeChromium) {
        features.push('chromecast');
    }

    return features;
}();

/**
     * Do exit according to platform
     */
function doExit() {
    try {
        if (window.NativeShell?.AppHost?.exit) {
            window.NativeShell.AppHost.exit();
        } else if (browser.tizen) {
            tizen.application.getCurrentApplication().exit();
        } else if (browser.web0s) {
            webOS.platformBack();
        } else {
            window.close();
        }
    } catch (err) {
        console.error('error closing application: ' + err);
    }
}

let exitPromise;

/**
     * Ask user for exit
     */
function askForExit() {
    if (exitPromise) {
        return;
    }

    import('../components/actionSheet/actionSheet').then((actionsheet) => {
        exitPromise = actionsheet.show({
            title: globalize.translate('MessageConfirmAppExit'),
            items: [
                {id: 'yes', name: globalize.translate('Yes')},
                {id: 'no', name: globalize.translate('No')}
            ]
        }).then(function (value) {
            if (value === 'yes') {
                doExit();
            }
        }).finally(function () {
            exitPromise = null;
        });
    });
}

let deviceId;
let deviceName;

export const appHost = {
    getWindowState: function () {
        return document.windowState || 'Normal';
    },
    setWindowState: function () {
        alert('setWindowState is not supported and should not be called');
    },
    exit: function () {
        if (!!window.appMode && browser.tizen) {
            askForExit();
        } else {
            doExit();
        }
    },
    supports: function (command) {
        if (window.NativeShell) {
            return window.NativeShell.AppHost.supports(command);
        }

        return supportedFeatures.indexOf(command.toLowerCase()) !== -1;
    },
    preferVisualCards: browser.android || browser.chrome,
    getDefaultLayout: function () {
        if (window.NativeShell) {
            return window.NativeShell.AppHost.getDefaultLayout();
        }

        return getDefaultLayout();
    },
    getDeviceProfile: getDeviceProfile,
    init: function () {
        if (window.NativeShell) {
            return window.NativeShell.AppHost.init();
        }

        return {
            deviceId: getDeviceId(),
            deviceName: getDeviceName()
        };
    },
    deviceName: function () {
        return window.NativeShell && window.NativeShell.AppHost.deviceName
            ? window.NativeShell.AppHost.deviceName() : getDeviceName();
    },
    deviceId: function () {
        return window.NativeShell && window.NativeShell.AppHost.deviceId
            ? window.NativeShell.AppHost.deviceId() : getDeviceId();
    },
    appName: function () {
        return window.NativeShell ? window.NativeShell.AppHost.appName() : appName;
    },
    appVersion: function () {
        return window.NativeShell ? window.NativeShell.AppHost.appVersion() : appVersion;
    },
    getPushTokenInfo: function () {
        return {};
    },
    setUserScalable: function (scalable) {
        if (!browser.tv) {
            const att = scalable ? 'width=device-width, initial-scale=1, minimum-scale=1, user-scalable=yes' : 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no';
            document.querySelector('meta[name=viewport]').setAttribute('content', att);
        }
    }
};

let isHidden = false;
let hidden;
let visibilityChange;

if (typeof document.hidden !== 'undefined') { /* eslint-disable-line compat/compat */
    hidden = 'hidden';
    visibilityChange = 'visibilitychange';
} else if (typeof document.webkitHidden !== 'undefined') {
    hidden = 'webkitHidden';
    visibilityChange = 'webkitvisibilitychange';
}

document.addEventListener(visibilityChange, function () {
    /* eslint-disable-next-line compat/compat */
    if (document[hidden]) {
        onAppHidden();
    } else {
        onAppVisible();
    }
}, false);

if (window.addEventListener) {
    window.addEventListener('focus', onAppVisible);
    window.addEventListener('blur', onAppHidden);
}

// load app host on module load
appHost.init();
