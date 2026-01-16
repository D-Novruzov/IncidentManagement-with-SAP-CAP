using {
    UI,
    Common
} from '@sap/cds/annotations';

using IncidentService from './incident-service';

annotate IncidentService.Incidents with {
    ID_ID     @Common.Label: 'Incident ID';
    title     @Common.Label: 'Title';
    status    @Common.Label: 'Status';
    priority  @Common.Label: 'Priority';
    slaStatus @Common.Label: 'SLA';
};

annotate IncidentService.Incidents with @UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: ID_ID,
        Label: 'ID'
    },
    {
        $Type: 'UI.DataField',
        Value: title,
        Label: 'Title'
    },
    {
        $Type: 'UI.DataField',
        Value: priority,
        Label: 'Priority'
    },
    {
        $Type: 'UI.DataField',
        Value: status,
        Label: 'Status'
    },
    {
        $Type: 'UI.DataField',
        Value: slaStatus,
        Label: 'SLA'
    }
];


annotate IncidentService.Incidents with @UI.SelectionFields: [
    priority,
    status,
    customer_ID
];

annotate IncidentService.Incidents with {
    @UI.Facets             : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General',
            Target: '@UI.FieldGroup#general'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'SLA',
            Target: '@UI.FieldGroup#sla'
        }
    ];

    @UI.FieldGroup #general: {Data: [
        {
            $Type: 'UI.DataField',
            Value: title
        },
        {
            $Type: 'UI.DataField',
            Value: description
        }
    ]};

    @UI.FieldGroup #sla    : {Data: [
        {
            $Type: 'UI.DataField',
            Value: slaStatus
        },
        {
            $Type: 'UI.DataField',
            Value: slaDueDate
        }
    ]};
};
