import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';
import FAN_FIRSTNAME from '@salesforce/schema/Fan__c.First_Name__c';
import FAN_LASTNAME from '@salesforce/schema/Fan__c.Last_Name__c';
import FAN_DATE_OF_BIRTH from '@salesforce/schema/Fan__c.Date_of_Birth__c';
import FAN_LOYALTY_POINTS from '@salesforce/schema/Fan__c.Loyalty_Points_Balance__c';
import FAN_LIFETIME_POINTS from '@salesforce/schema/Fan__c.Lifetime_Points__c';
import FAN_LOYALTY_TIER from '@salesforce/schema/Fan__c.Loyalty_Tier__c';

export default class BirthdayPerksWidget extends LightningElement {
    _recordId;
    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        if (this._recordId !== value) {
            this._recordId = value;
            this._resolvedId = value;
        }
    }

    @track _resolvedId;
    @track isBirthdayToday = false;
    @track fanName = '';
    @track pointsBalance = 0;
    @track daysUntilNext = 0;
    @track lifetimePoints = 0;
    @track currentTier = '';
    @track progressPercent = 0;

    bonusPoints = 100;
    tierThresholds = {
        'Bronze':   0,
        'Silver':   500,
        'Gold':     2000,
        'Platinum': 5000
    };

    @wire(CurrentPageReference)
    wiredPageRef(ref) {
        if (!ref) return;

        const fromAttr  = ref.attributes?.recordId;
        const fromState = ref.state?.recordId;
        const fromUrl   = new URLSearchParams(window.location.search).get('recordId');
        const fromPath  = this._extractIdFromPath();

        const resolved = this._recordId || fromAttr || fromState || fromUrl || fromPath;
        if (resolved && resolved !== this._resolvedId) {
            this._recordId  = resolved;
            this._resolvedId = resolved;
        }
    }

    connectedCallback() {
        if (this._resolvedId) return;

        const fromUrl  = new URLSearchParams(window.location.search).get('recordId');
        const fromPath = this._extractIdFromPath();
        const resolved = this._recordId || fromUrl || fromPath;
        if (resolved) {
            this._recordId   = resolved;
            this._resolvedId = resolved;
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

    @wire(getRecord, {
        recordId: '$_resolvedId',
        fields: [FAN_FIRSTNAME, FAN_LASTNAME, FAN_DATE_OF_BIRTH,
                 FAN_LOYALTY_POINTS, FAN_LIFETIME_POINTS, FAN_LOYALTY_TIER]
    })
    wiredFan({ error, data }) {
        if (data) {
            const firstName = data.fields.First_Name__c?.value || '';
            const lastName  = data.fields.Last_Name__c?.value  || '';
            this.fanName       = `${firstName} ${lastName}`.trim() || 'Fan';
            this.pointsBalance = data.fields.Loyalty_Points_Balance__c?.value || 0;
            this.lifetimePoints = data.fields.Lifetime_Points__c?.value       || 0;
            this.currentTier   = data.fields.Loyalty_Tier__c?.value           || 'Bronze';

            this.calculateProgress();

            const dobRaw = data.fields.Date_of_Birth__c?.value;
            if (dobRaw) {
                const today = new Date();
                const dob   = new Date(dobRaw);
                const isToday = dob.getDate()  === today.getDate() &&
                                dob.getMonth() === today.getMonth();
                this.isBirthdayToday = isToday;
                if (!isToday) {
                    let nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
                    if (nextBirthday < today) {
                        nextBirthday.setFullYear(today.getFullYear() + 1);
                    }
                    const diffTime = nextBirthday - today;
                    this.daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
            }
        } else if (error) {
            console.error('Error loading fan data', error);
        }
    }

    calculateProgress() {
        const current = this.lifetimePoints;
        let nextThreshold = 999999;

        if      (this.currentTier === 'Bronze')   nextThreshold = this.tierThresholds.Silver;
        else if (this.currentTier === 'Silver')   nextThreshold = this.tierThresholds.Gold;
        else if (this.currentTier === 'Gold')     nextThreshold = this.tierThresholds.Platinum;
        else if (this.currentTier === 'Platinum') {
            this.progressPercent = 100;
            return;
        }

        const currentTierMin = this.tierThresholds[this.currentTier];
        const needed = nextThreshold - currentTierMin;
        const earned = current - currentTierMin;
        this.progressPercent = Math.min(100, Math.floor((earned / needed) * 100));
        if (this.progressPercent < 0) this.progressPercent = 0;
    }

    renderedCallback() {
        const progressFill = this.template.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = this.progressPercent + '%';
        }
    }
}