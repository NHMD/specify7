define([
    'jquery', 'underscore', 'backbone', 'specifyapi', 'schema', 'specifyform', 'datamodelview',
    'views', 'schemalocalization', 'beautify-html', 'navigation', 'jquery-bbq'
], function(
    $, _, Backbone, specifyapi, schema, specifyform, datamodelview,
    views, schemalocalization, beautify, navigation) {
    "use strict";

    var app = {
        currentView: null,
        start: appStart
    };

    function appStart() {
        var rootContainer = $('#content');

        function setCurrentView(view) {
            app.currentView && app.currentView.remove();
            $('.ui-autocomplete').remove(); // these are getting left behind sometimes
            app.currentView = view;
            app.currentView.render();
            rootContainer.append(app.currentView.el);
            window.specifyParentResource = null;
        }

        function getViewdef() { return $.deparam.querystring().viewdef; }

        var SpecifyRouter = Backbone.Router.extend({
            routes: {
                'recordset/:id/*splat': 'recordSet',
                'view/:model/:id/:related/new/*splat': 'addRelated',
                'view/:model/:id/:related/:index/*splat': 'viewSingleToMany',
                'view/:model/:id/:related/*splat': 'viewRelated',
                'view/:model/:id/*splat': 'view',
                'viewashtml/*splat': 'viewashtml',
                'datamodel/:model/': 'datamodel',
                'datamodel/': 'datamodel'
            },

            addRelated: function(modelName, id, relatedFieldName) {
                var resource = window.specifyParentResource ||
                    new (specifyapi.Resource.forModel(modelName))({ id: id });
                var relatedField = resource.specifyModel.getField(relatedFieldName);

                var relatedResource = new (specifyapi.Resource.forModel(relatedField.getRelatedModel()))();
                var view = new views.RelatedView({
                    model: relatedResource,
                    parentResource: resource,
                    parentModel: resource.specifyModel,
                    relatedField: relatedField,
                    viewdef: getViewdef(),
                    adding: true
                });

                switch (relatedField.type) {
                case 'one-to-many':
                    relatedResource.set(relatedField.otherSideName, resource.url(), { silent: true });
                    break;
                case 'many-to-one':
                    view.on('savecomplete', function() {
                        resource.set(relatedField.name, relatedResource.url());
                    });
                    break;
                }
                view.on('savecomplete', function() {
                    navigation.navigate(relatedResource.viewUrl(), { replace: true, trigger: true });
                });

                relatedResource.placeInSameHierarchy(resource);
                setCurrentView(view);
            },

            viewSingleToMany: function(modelName, id, relatedFieldName, index) {
                index = parseInt(index, 10);
                var resource = window.specifyParentResource ||
                    new (specifyapi.Resource.forModel(modelName))({ id: id });
                resource.rget(relatedFieldName).done(function(collection) {
                    collection.fetchIfNotPopulated().done(function() {
                        var relatedResource = collection.at(index);
                        setCurrentView(new views.RelatedView({
                            model: relatedResource,
                            parentResource: resource,
                            parentModel: resource.specifyModel,
                            relatedField: resource.specifyModel.getField(relatedFieldName),
                            viewdef: getViewdef(),
                            adding: false
                        }));
                    });
                });
            },

            viewRelated: function(modelName, id, relatedFieldName) {
                var resource = window.specifyParentResource ||
                    new (specifyapi.Resource.forModel(modelName))({ id: id });
                var relatedField = resource.specifyModel.getField(relatedFieldName);
                switch (relatedField.type) {
                case 'one-to-many':
                    setCurrentView(new views.CollectionView({
                        parentResource: resource,
                        parentModel: resource.specifyModel,
                        relatedField: relatedField,
                        viewdef: getViewdef(),
                        adding: false
                    }));
                    break;
                case 'many-to-one':
                    resource.rget(relatedField.name).done(function(relatedResource) {
                        setCurrentView(new views.RelatedView({
                            model: relatedResource,
                            parentResource: resource,
                            parentModel: resource.specifyModel,
                            relatedField: relatedField,
                            viewdef: getViewdef(),
                            adding: false
                        }));
                    });
                    break;
                }
            },

            recordSet: function(id) {
                var recordSet = new (specifyapi.Resource.forModel('recordset'))({ id: id });
                setCurrentView(new views.RecordSetView({ model: recordSet }));
            },

            view: function(modelName, id) {
                setCurrentView(new views.ResourceView({ modelName: modelName, resourceId: id }));
            },

            viewashtml: function() {
                app.currentView && app.currentView.remove();
                var params = $.deparam.querystring();
                var form = params.viewdef ?
                    specifyform.buildViewByViewDefName(params.viewdef) :
                    specifyform.buildViewByName(params.view);
                if (params.localize && params.localize.toLowerCase() !== 'false')
                    schemalocalization.localizeForm(form);
                var html = $('<div>').append(form).html();
                rootContainer.empty().append(
                    $('<pre>').text(beautify.style_html(html))
                );
                app.currentView = null;
            },

            datamodel: function(model) {
                app.currentView && app.currentView.remove();
                var View = model ? datamodelview.DataModelView : datamodelview.SchemaView;
                app.currentView = new View({ model: model }).render();
                rootContainer.append(app.currentView.el);
            }
        });

        var specifyRouter = new SpecifyRouter();
        Backbone.history.start({pushState: true, root: '/specify/'});
    }

    return app;
});