import { LightningElement, api, wire, track } from 'lwc';
import getEventsBySport from '@salesforce/apex/SportEventController.getEventsBySport';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';

export default class SportEventList extends NavigationMixin(LightningElement) {
    _recordId;
    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        if (this._recordId !== value) {
            this._recordId = value;
        }
    }

    events = [];
    error;
    isLoading = true;

    @wire(CurrentPageReference)
    wiredPageRef(ref) {
        if (!ref) return;

        const fromAttr  = ref.attributes?.recordId;
        const fromState = ref.state?.recordId;
        const fromUrl   = new URLSearchParams(window.location.search).get('recordId');
        const fromPath  = this._extractIdFromPath();

        const resolved = this._recordId || fromAttr || fromState || fromUrl || fromPath;
        if (resolved && resolved !== this._recordId) {
            this._recordId = resolved;
        }
    }

    @track _resolvedId;

    @wire(CurrentPageReference)
    wiredPageRefForWire(ref) {
        if (!ref) return;

        const fromAttr  = ref.attributes?.recordId;
        const fromState = ref.state?.recordId;
        const fromUrl   = new URLSearchParams(window.location.search).get('recordId');
        const fromPath  = this._extractIdFromPath();

        const resolved = this._recordId || fromAttr || fromState || fromUrl || fromPath;
        if (resolved && resolved !== this._resolvedId) {
            this._resolvedId = resolved;
            this._recordId   = resolved;
        }
    }

    @wire(getEventsBySport, { sportId: '$_resolvedId' })
    wiredEvents({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.events = data.map(ev => {
                const dateObj    = new Date(ev.Date_Time__c);
                const soldPercent = ev.Total_Tickets__c > 0
                    ? (ev.Tickets_Sold__c / ev.Total_Tickets__c * 100).toFixed(0)
                    : 0;
                const isSoldOut  = ev.Tickets_Sold__c >= ev.Total_Tickets__c;
                const statusColor = this.getStatusColor(ev.Status__c);
                return {
                    Id:               ev.Id,
                    Name:             ev.Name,
                    Status__c:        ev.Status__c,
                    Tickets_Sold__c:  ev.Tickets_Sold__c,
                    Total_Tickets__c: ev.Total_Tickets__c,
                    soldPercent:      soldPercent,
                    progressStyle:    'width: ' + soldPercent + '%;',
                    eventDate:        dateObj.toLocaleDateString(),
                    eventTime:        dateObj.toLocaleTimeString(),
                    stadiumName:      ev.Stadium__r      ? ev.Stadium__r.Name             : '',
                    homeTeam:         ev.Home_Team__r    ? ev.Home_Team__r.Name           : '',
                    awayTeam:         ev.Away_Team__r    ? ev.Away_Team__r.Name           : '',
                    homeLogo:         ev.Home_Team__r    ? ev.Home_Team__r.Logo_URL__c    : '',
                    awayLogo:         ev.Away_Team__r    ? ev.Away_Team__r.Logo_URL__c    : '',
                    badgeLabel:       isSoldOut ? 'SOLD OUT' : 'ON SALE',
                    badgeVariant:     isSoldOut ? 'error'    : 'success',
                    statusColor:      statusColor
                };
            });
            this.error = undefined;
        } else if (error) {
            this.error  = error;
            this.events = [];
        }
    }

    connectedCallback() {
        if (!this._resolvedId) {
            const fromUrl  = new URLSearchParams(window.location.search).get('recordId');
            const fromPath = this._extractIdFromPath();
            const resolved = this._recordId || fromUrl || fromPath;
            if (resolved) {
                this._resolvedId = resolved;
                this._recordId   = resolved;
            }
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

    getStatusColor(status) {
        const map = {
            'Scheduled': '#6c757d',
            'On Sale':   '#28a745',
            'Sold Out':  '#dc3545',
            'Live':      '#ffc107',
            'Completed': '#17a2b8',
            'Cancelled': '#6c757d'
        };
        return map[status] || '#6c757d';
    }

    handleCreateEvent() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Sport_Event__c',
                actionName:    'new'
            }
        });
    }

    navigateToEvent(event) {
        const eventId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId:      eventId,
                objectApiName: 'Sport_Event__c',
                actionName:    'view'
            }
        });
    }

    get hasEvents() {
        return this.events && this.events.length > 0;
    }
}