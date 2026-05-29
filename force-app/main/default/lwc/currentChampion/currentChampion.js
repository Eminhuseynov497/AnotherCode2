import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getChampionBySportName from '@salesforce/apex/ChampionController.getChampionBySportName';
import getChampionBySportId from '@salesforce/apex/ChampionController.getChampionBySportId';

export default class CurrentChampion extends LightningElement {
    @api sportName;

    _recordId;
    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        if (this._recordId !== value) {
            this._recordId = value;
            this.loadChampion();
        }
    }

    champion;
    error;
    _loaded = false;

    @wire(CurrentPageReference)
    wiredPageRef(ref) {
        if (!ref) return;

        const fromAttr  = ref.attributes?.recordId;
        const fromState = ref.state?.recordId;
        const fromUrl   = new URLSearchParams(window.location.search).get('recordId');
        const fromPath  = this._extractIdFromPath();

        const resolvedId   = this._recordId || fromAttr || fromState || fromUrl || fromPath;
        const resolvedName = this.sportName
            || ref.state?.sportName
            || new URLSearchParams(window.location.search).get('sportName');

        if (resolvedName && resolvedName !== this.sportName) {
            this.sportName = resolvedName;
        }
        if (resolvedId && resolvedId !== this._recordId) {
            this._recordId = resolvedId;
        }

        if (!this._loaded) {
            this._loaded = true;
            this.loadChampion();
        }
    }

    connectedCallback() {
        const urlParams = new URLSearchParams(window.location.search);

        if (!this._recordId) {
            const fromUrl  = urlParams.get('recordId');
            const fromPath = this._extractIdFromPath();
            if (fromUrl || fromPath) {
                this._recordId = fromUrl || fromPath;
            }
        }

        if (!this.sportName) {
            const fromUrl = urlParams.get('sportName');
            if (fromUrl) this.sportName = fromUrl;
        }

        if ((this._recordId || this.sportName) && !this._loaded) {
            this._loaded = true;
            this.loadChampion();
        }
    }

    _extractIdFromPath() {

        const segments = window.location.pathname.split('/').filter(Boolean);
        if (segments.length < 2) return null;

        const candidate = segments[segments.length - 2];
        if (candidate && /^[a-zA-Z0-9]{15,18}$/.test(candidate)) {
            return candidate;
        }
        return null;
    }

    loadChampion() {
        this.error = undefined;

        if (this.sportName && this.sportName.trim().length > 0) {
            getChampionBySportName({ sportName: this.sportName })
                .then(data => {
                    this.champion = data;
                    this.error = undefined;
                })
                .catch(err => {
                    this.error = err;
                    this.champion = undefined;
                });

        } else if (this._recordId) {
            getChampionBySportId({ sportId: this._recordId })
                .then(data => {
                    this.champion = data;
                    this.error = undefined;
                })
                .catch(err => {
                    this.error = err;
                    this.champion = undefined;
                });

        } else {
            this.error = 'Neither sportName nor recordId is provided.';
            this.champion = undefined;
        }
    }

    get errorMessage() {
        if (!this.error) return '';
        if (this.error.body && this.error.body.message) {
            return this.error.body.message;
        }
        return String(this.error);
    }

    get hasLogo() {
        return this.champion &&
               this.champion.teamLogoUrl &&
               this.champion.teamLogoUrl.trim().length > 0;
    }

    get teamInitials() {
        if (!this.champion || !this.champion.teamName) return '??';
        const words = this.champion.teamName.trim().split(' ');
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return words.map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }

    get initialsStyle() {
        return 'background-color: #0A2472; color: #FFFFFF;';
    }
}