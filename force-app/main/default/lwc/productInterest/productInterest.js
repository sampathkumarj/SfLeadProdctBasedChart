import { LightningElement, api, track, wire } from 'lwc';
import getLeadCountForProductInterest from '@salesforce/apex/LeadController.getLeadCountForProductInterest';
import { getRecord } from 'lightning/uiRecordApi';
import { loadScript } from 'lightning/platformResourceLoader'; // To load static resources

// Define the Lead object and ProductInterest__c field
const FIELDS = ['Lead.ProductInterest__c'];
import CHARTJS from '@salesforce/resourceUrl/ChartJS'; // Import ChartJS static resource

export default class ProductInterestLeadCount extends LightningElement {
    @api recordId; // Record ID of the current lead
    @track leadCounts = null; // Store the lead counts for the selected product interest
    @track errorMessage = ''; // To store error messages
    chartJsLibrary; // Reference for loaded Chart.js
    chartInitialized = false; // Ensure the chart is initialized only once

    // Wire the getRecord method to automatically fetch data when the recordId changes
    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    lead;

    // Watch for changes in the lead's ProductInterest__c field
    get productInterest() {
        return this.lead.data ? this.lead.data.fields.ProductInterest__c.value : null;
    }

    // Fetch the lead count data when the ProductInterest__c field is available
    @wire(getLeadCountForProductInterest, { productInterest: '$productInterest' })
    leadCountsData({ error, data }) {
        if (data) {
            // Successfully received lead counts
            this.leadCounts = data.leadCounts;
            this.errorMessage = '';
            this.renderChart();
        } else if (error) {
            // Handle errors when fetching lead counts
            this.errorMessage = `Error fetching lead count data: ${error.body.message}`;
        }
    }

    // Render the chart based on the fetched data
    renderChart() {
        if (!this.leadCounts || this.chartInitialized) {
            return; // Ensure chart is initialized only once and leadCounts exist
        }

        // Wait for the canvas to render
        const canvasElement = this.template.querySelector('canvas.chart');
        if (!canvasElement) {
            console.error('Canvas element not found or not yet rendered.');
            return;
        }

        const ctx = canvasElement.getContext('2d');
        if (!ctx) {
            console.error('Unable to get context from canvas.');
            return;
        }

        const labels = ['Closed - Not Converted', 'Open - Not Contacted', 'Working - Contacted', 'Converted'];
        const data = [
            this.leadCounts['Closed - Not Converted'] || 0,
            this.leadCounts['Open - Not Contacted'] || 0,
            this.leadCounts['Working - Contacted'] || 0,
            this.leadCounts['Converted'] || 0
        ];

        new this.chartJsLibrary(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Lead Count by Status',
                        data: data,
                        backgroundColor: [
                            'rgba(139, 0, 0, 0.8)', // Dark Red
                            'rgba(0, 0, 139, 0.8)', // Dark Blue
                            'rgba(204, 153, 0, 0.8)', // Dark Yellow
                            'rgba(0, 100, 0, 0.8)' // Dark Green
                        ],
                        borderColor: [
                            'rgba(139, 0, 0, 1)', // Dark Red
                            'rgba(0, 0, 139, 1)', // Dark Blue
                            'rgba(204, 153, 0, 1)', // Dark Yellow
                            'rgba(0, 100, 0, 1)' // Dark Green
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        this.chartInitialized = true;
    }

    // Load Chart.js after the component is inserted in the DOM
    renderedCallback() {
        if (this.chartJsLibrary) {
            return; // Chart.js is already loaded
        }
        loadScript(this, CHARTJS)
            .then(() => {
                this.chartJsLibrary = window.Chart;
                this.renderChart();
            })
            .catch(error => {
                this.errorMessage = `Error loading Chart.js: ${error.message}`;
            });
    }
}
