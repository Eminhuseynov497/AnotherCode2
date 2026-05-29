import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import cancelOrder from '@salesforce/apex/OrderCancellationController.cancelOrder';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CancelOrderButton extends LightningElement {
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

    isProcessing = false;

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

    connectedCallback() {
        if (this._recordId) return;

        const fromUrl  = new URLSearchParams(window.location.search).get('recordId');
        const fromPath = this._extractIdFromPath();
        const resolved = fromUrl || fromPath;
        if (resolved) {
            this._recordId = resolved;
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

    handleCancel() {
        if (!this._recordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'The button must be placed on the order record page.',
                    variant: 'error'
                })
            );
            return;
        }

        if (!confirm('Are you sure you want to cancel this order? Tickets will be returned to sale and loyalty points will be restored.')) {
            return;
        }

        this.isProcessing = true;

        cancelOrder({ orderId: this._recordId })
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Order cancelled',
                        variant: 'success'
                    })
                );
                setTimeout(() => {
                    location.reload();
                }, 1500);
            })
            .catch(error => {
                let errorMessage = 'Failed to cancel the order.';
                if (error.body && error.body.message) {
                    errorMessage = error.body.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: errorMessage,
                        variant: 'error'
                    })
                );
                this.isProcessing = false;
            });
    }
}