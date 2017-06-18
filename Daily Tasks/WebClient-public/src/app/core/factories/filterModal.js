angular.module('proton.core')
.factory('filterModal', ($timeout, $rootScope, pmModal, gettextCatalog, Filter, networkActivityTracker, notify, CONSTANTS, eventManager, labelModal, labelsModel) => {
    return pmModal({
        controllerAs: 'ctrl',
        templateUrl: 'templates/modals/filter.tpl.html',
        controller(params) {
            const labelsOrdered = labelsModel.get('labels');
            const foldersOrdered = labelsModel.get('folders');
            const ctrl = this;
            const model = angular.copy(params.filter);

            ctrl.hasLabels = false;
            ctrl.hasMove = false;
            ctrl.hasMark = false;
            ctrl.folders = foldersOrdered;

            ctrl.types = [
                { label: gettextCatalog.getString('Select', null), value: 'select' },
                { label: gettextCatalog.getString('Subject', null), value: 'subject' },
                { label: gettextCatalog.getString('Sender', null), value: 'sender' },
                { label: gettextCatalog.getString('Recipient', null), value: 'recipient' },
                { label: gettextCatalog.getString('Attachments', null), value: 'attachments' }
            ];

            ctrl.comparators = [
                { label: gettextCatalog.getString('contains', null), value: 'contains' },
                { label: gettextCatalog.getString('is exactly', null), value: 'is' },
                { label: gettextCatalog.getString('begins with', null), value: 'starts' },
                { label: gettextCatalog.getString('ends with', null), value: 'ends' },
                { label: gettextCatalog.getString('matches', null), value: 'matches' },
                { label: gettextCatalog.getString('does not contain', null), value: '!contains' },
                { label: gettextCatalog.getString('is not', null), value: '!is' },
                { label: gettextCatalog.getString('does not begin with', null), value: '!starts' },
                { label: gettextCatalog.getString('does not end with', null), value: '!ends' },
                { label: gettextCatalog.getString('does not match', null), value: '!matches' }
            ];

            ctrl.operators = [
                { label: gettextCatalog.getString('all', null), value: 'all' },
                { label: gettextCatalog.getString('any', null), value: 'any' }
            ];

            /**
             * Open a modal to create a new folder / label
             * @param  {Number} [Exclusive=0]
             */
            function openLabelModal(Exclusive = 0) {
                labelModal.activate({
                    params: {
                        label: { Exclusive },
                        close() {
                            labelModal.deactivate();
                        }
                    }
                });
            }

            /**
             * Prepare the Conditions Model
             * @param {Object}
             * @return {Array}
             */
            function prepareConditions({ Simple = {} } = {}) {
                const { Conditions = [] } = Simple;
                const conditions = Conditions.map(({ Type = {}, Comparator = {}, Values = [] }) => ({
                    Values,
                    value: '',
                    Type: _.findWhere(ctrl.types, { value: Type.value }),
                    Comparator: _.findWhere(ctrl.comparators, { value: Comparator.value })
                }));

                if (conditions.length === 0) {
                    conditions.push({
                        Values: [],
                        value: '',
                        Type: ctrl.types[0],
                        Comparator: ctrl.comparators[0]
                    });
                }

                return conditions;
            }

            /**
             * Prepare the Actions Model
             * @param {Object}
             * @return {Object} actions
             */
            function prepareActions({ Simple = {} } = {}) {
                const { Actions = {} } = Simple;
                const { Move, Mark = { Read: false, Starred: false }, Labels = [] } = Actions;
                const actions = {};
                const move = Move || '';

                ctrl.hasMove = move.length > 0;
                actions.Move = (move.length) ? move : CONSTANTS.MAILBOX_IDENTIFIERS.inbox;
                ctrl.hasMark = (Mark.Read || Mark.Starred);
                actions.Mark = Mark;
                ctrl.hasLabels = Labels.length > 0;
                actions.Labels = labelsOrdered.map((label) => {
                    label.Selected = _.findIndex(Labels, { Name: label.Name }) !== -1;

                    return label;
                });

                return actions;
            }

            /**
             * Prepare the Operator model
             * @param {Object}
             * @return {Object}
             */
            function prepareOperator({ Simple = {} } = {}) {
                const { Operator = {} } = Simple;
                const { value = 'all' } = Operator;

                return _.findWhere(ctrl.operators, { value });
            }

            /**
             * Prepare the ID
             * @param  {String} {ID=''}
             * @return {String}
             */
            function prepareID({ ID = '' } = {}) {
                return ID;
            }

            /**
             * Prepare the Name
             * @param  {String} Name
             * @return {String}
             */
            function prepareName({ Name = '' } = {}) {
                return Name;
            }

            /**
             * Prepare the Status
             * @param  {Integer} Status
             * @return {Integer}
             */
            function prepareStatus({ Status = 1 } = {}) {
                return Status;
            }

            ctrl.addLabel = () => openLabelModal(0);
            ctrl.addFolder = () => openLabelModal(1);

            ctrl.initialization = () => {
                ctrl.filter = {
                    ID: prepareID(model),
                    Name: prepareName(model),
                    Status: prepareStatus(model),
                    Version: CONSTANTS.FILTER_VERSION
                };

                if (params.mode === 'simple') {
                    ctrl.mode = 'simple';
                    ctrl.filter.Simple = {
                        Operator: prepareOperator(model),
                        Conditions: prepareConditions(model),
                        Actions: prepareActions(model)
                    };
                } else if (params.mode === 'complex') {
                    ctrl.mode = 'complex';
                    ctrl.filter.Sieve = model.Sieve;
                }

                if (angular.isObject(ctrl.filter.Simple)) {
                    const unsubscribe = $rootScope.$on('labelsModel', (e, { type }) => {
                        if (type === 'cache.update') {
                            ctrl.filter.Simple.Actions.Labels = _.sortBy(labelModal.get(), 'Order');
                        }
                    });

                    ctrl.$onDestroy = () => {
                        unsubscribe();
                    };
                }

                $timeout(() => {
                    angular.element('#filterName').focus();
                }, 100, false);
            };

            /**
             * Condition Attachements:
             * When you select an option, assign the valid object to the comparator on change
             * @param  {Object} model
             * @param  {String} value Value selected
             * @return {void}
             */
            ctrl.onChangeAttachements = (model, value) => {
                model.Comparator = _.findWhere(ctrl.comparators, { value });
            };

            ctrl.displaySeparator = () => {
                if (ctrl.filter.Simple) {
                    const conditions = ctrl.filter.Simple.Conditions;

                    return conditions.length > 0 && conditions[0].Type.value !== 'select';
                }

                return false;
            };

            ctrl.valid = () => {
                let pass = true;

                // Check name
                pass = ctrl.filter.Name.length > 0;

                if (angular.isObject(ctrl.filter.Simple) && Object.keys(ctrl.filter.Simple).length > 0) {
                    // Simple mode
                    // Check conditions
                    let attachmentsCondition = 0;

                    _.each(ctrl.filter.Simple.Conditions, (condition) => {
                        pass = pass && condition.Type.value !== 'select';

                        if (condition.Type.value === 'subject' || condition.Type.value === 'sender' || condition.Type.value === 'recipient') {
                            pass = pass && condition.Values.length > 0;
                        }

                        if (condition.Type.value === 'attachments') {
                            attachmentsCondition++;
                        }
                    });

                    pass = pass && attachmentsCondition <= 1;

                    // Check actions
                    pass = pass && (ctrl.hasLabels || ctrl.hasMove || ctrl.hasMark);

                    if (ctrl.hasLabels === true) {
                        pass = pass && _.where(ctrl.filter.Simple.Actions.Labels, { Selected: true }).length > 0;
                    }

                    if (ctrl.hasMark === true) {
                        pass = pass && (ctrl.filter.Simple.Actions.Mark.Starred || ctrl.filter.Simple.Actions.Mark.Read);
                    }

                    return pass;
                }
                // Complex mode
                // Check sieve script content
                return ctrl.filter.Sieve.length > 0;
            };

            ctrl.addCondition = () => {
                ctrl.filter.Simple.Conditions.push({
                    Type: _.first(ctrl.types),
                    Comparator: _.first(ctrl.comparators),
                    Values: [],
                    value: ''
                });
            };

            ctrl.addValue = (condition) => {
                if (condition.Values.indexOf(condition.value) === -1) {
                    if (condition.value) {
                        condition.Values.push(condition.value);
                        condition.value = '';
                    }
                } else {
                    notify({ message: gettextCatalog.getString('Text or pattern already included', null), classes: 'notification-danger' });
                }
            };

            ctrl.removeCondition = (condition) => {
                const index = ctrl.filter.Simple.Conditions.indexOf(condition);

                ctrl.filter.Simple.Conditions.splice(index, 1);
            };

            ctrl.save = () => {
                let promise;
                let messageSuccess;
                const clone = angular.copy(ctrl.filter);

                if (angular.isObject(ctrl.filter.Simple) && Object.keys(ctrl.filter.Simple).length > 0) {
                    if (ctrl.hasLabels === true) {
                        clone.Simple.Actions.Labels = _.filter(clone.Simple.Actions.Labels, (label) => { return label.Selected === true; });
                    } else {
                        clone.Simple.Actions.Labels = [];
                    }

                    if (ctrl.hasMove === false) {
                        clone.Simple.Actions.Move = null;
                    }

                    if (ctrl.hasMark === false) {
                        clone.Simple.Actions.Mark = { Read: false, Starred: false };
                    }
                }

                if (clone.ID) {
                    promise = Filter.update(clone);
                    messageSuccess = gettextCatalog.getString('Filter updated', null, 'Notification');
                } else {
                    promise = Filter.create(clone);
                    messageSuccess = gettextCatalog.getString('Filter created', null, 'Notification');
                }

                networkActivityTracker.track(
                    promise.then((result) => {
                        if (result.data && result.data.Code === 1000) {
                            notify({ message: messageSuccess, classes: 'notification-success' });
                            eventManager.call();
                            params.close();
                        } else if (result.data && result.data.Error) {
                            notify({ message: result.data.Error, classes: 'notification-danger' });

                            if (result.data.Code === 50016) {
                                eventManager.call();
                                params.close();
                            }
                        }
                    })
                );
            };

            ctrl.cancel = () => {
                params.close();
            };

            ctrl.initialization();
        }
    });
});
