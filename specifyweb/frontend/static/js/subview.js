define([
    'require', 'jquery', 'underscore', 'backbone',
    'specifyform', 'querycbxsearch', 'templates', 'assert'
], function(require, $, _, Backbone, specifyform, QueryCbxSearch, templates, assert) {
    "use strict";

    return Backbone.View.extend({
        __name__: "Subview",
        initialize: function(options) {
            // options = {
            //   field: specify field object that this subview is showing a record for,
            //   model: schema.Model.Resource? the resource this subview is showing,
            //   parentResource: schema.Model.Resource
            // }
            this.field = options.field;
            this.parentResource = options.parentResource;
            this.title = this.field.getLocalizedName();
            this.readOnly = specifyform.subViewMode(this.$el) === 'view';
        },
        render: function() {
            var self = this;
            self.$el.empty();
            var header = $(templates.subviewheader({
                title: self.title,
                dependent: self.field.isDependent()
            }));
            $('.specify-visit-related', header).remove();

            header.on('click', '.specify-delete-related', this.delete.bind(this));
            header.on('click', '.specify-add-related', this.add.bind(this));

            var mode = self.field.isDependent() && !this.readOnly ? 'edit' : 'view';
            specifyform.buildSubView(self.$el, mode).done(function(form) {
                self.readOnly && $('.specify-delete-related, .specify-add-related', header).remove();

                self.$el.append(header);
                if (!self.model) {
                    $('.specify-delete-related', header).remove();
                    self.$el.append('<p>No Data.</p>');
                    return;
                } else {
                    $('.specify-add-related', header).remove();
                }

                require("populateform")(form, self.model);
                self.$el.append(form);
            });
            return self;
        },
        add: function() {
            var relatedModel = this.field.getRelatedModel();

            if (this.field.isDependent()) {
                this.model = new relatedModel.Resource();
                this.model.placeInSameHierarchy(this.parentResource);
                this.parentResource.set(this.field.name, this.model);
                this.render();
            } else {
                // TODO: this should be factored out from common code in querycbx
                var searchTemplateResource = new relatedModel.Resource({}, {
                    noBusinessRules: true,
                    noValidation: true
                });

                var _this = this;
                this.dialog = new QueryCbxSearch({
                    model: searchTemplateResource,
                    selected: function(resource) {
                        _this.model.set(_this.fieldName, resource);
                    }
                }).render().$el.on('remove', function() { _this.dialog = null; });
            }
        },
        delete: function() {
            this.parentResource.set(this.field.name, null);
            this.model = null;
            this.render();
        }
    });
});
