import { LightningElement, wire, api, track } from 'lwc';
import { MessageContext, publish } from 'lightning/messageService';
import BoatMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import { updateRecord } from 'lightning/uiRecordApi';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import {refreshApex} from '@salesforce/apex';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';

const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT     = 'Ship it!';
const SUCCESS_VARIANT     = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';
export default class BoatSearchResults extends LightningElement {
  selectedBoatId;
  columns = [
                { label: 'Name', fieldName: 'Name', type: 'text', editable: true },
                { label: 'Length', fieldName: 'Length__c', type: 'number', editable: true },
                { label: 'Price', fieldName: 'Price__c' , type: 'currency', editable: true},
                { label: 'Description ', fieldName: 'Description__c', type: 'text', editable: true },
            ];
  boatTypeId = '';
  boats;
  isLoading = false;
  @track draftValues = [];
  
  // wired message context
  @wire(MessageContext)
  messageContext;
  // wired getBoats method
  @wire(getBoats, {boatTypeId:'$boatTypeId'})
  wiredBoats(result) {
      this.boats=result;
   }
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api
  searchBoats(boatTypeId) { 
      this.boatTypeId=boatTypeId;
      this.notifyLoading(false);
  }
  
  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  async refresh() {
    await refreshApex(this.boats);
    this.notifyLoading(false);
   }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) { 
      this.selectedBoatId=event.detail.boatId;
      this.sendMessageService(event.detail.boatId);
      
  }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) { 
    // explicitly pass boatId to the parameter recordId
    publish(this.messageContext, BoatMC, { recordId: boatId});
  }
  
  // This method must save the changes in the Boat Editor
  // Show a toast message with the title
  // clear lightning-datatable draft values
  handleSave() {
    const recordInputs = event.detail.draftValues.slice().map(draft => {
        const fields = Object.assign({}, draft);
        return { fields };
    });
    const promises = recordInputs.map(recordInput =>
            //update boat record
            updateRecord(recordInput)
        );
    Promise.all(promises)
        .then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: SUCCESS_TITLE,
                    message: MESSAGE_SHIP_IT,
                    variant: SUCCESS_VARIANT
                })
            );
            this.refresh();
        })
        .catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: ERROR_TITLE,
                    message: error.message,
                    variant: ERROR_VARIANT
                })
             );
        })
        .finally(() => {
            this.draftValues = [];
        });
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  notifyLoading(isLoading) { 
      if(isLoading){
          this.dispatchEvent(new CustomEvent('loading',{detail:true}));
      } else {
        this.dispatchEvent(new CustomEvent('doneloading',{detail:true}));
      }
  }
}