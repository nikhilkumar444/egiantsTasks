angular.module('proton.message')
    .factory('messageActions', ($q, $rootScope, tools, cache, eventManager, messageApi, networkActivityTracker, CONSTANTS, notify, gettextCatalog, labelsModel) => {

        const REMOVE_ID = 0;
        const ADD_ID = 1;

        const notifySuccess = (message) => notify({ message, classes: 'notification-success' });

        function getFolderNameTranslated(mailbox) {
            const mailboxs = {
                inbox: gettextCatalog.getString('Inbox', null),
                spam: gettextCatalog.getString('Spam', null),
                drafts: gettextCatalog.getString('Drafts', null),
                sent: gettextCatalog.getString('Sent', null),
                trash: gettextCatalog.getString('Trash', null),
                archive: gettextCatalog.getString('Archive', null)
            };

            return mailboxs[mailbox];
        }

        $rootScope.$on('messageActions', (event, { action = '', data = {} }) => {
            switch (action) {
                case 'move':
                    move(data);
                    break;
                case 'star':
                    star(data.ids);
                    break;
                case 'unstar':
                    unstar(data.ids);
                    break;
                case 'read':
                    read(data.ids);
                    break;
                case 'unread':
                    unread(data.ids);
                    break;
                case 'delete':
                    destroy(data.ids);
                    break;
                case 'unlabel':
                    detachLabel(data.messageID, data.conversationID, data.labelID);
                    break;
                case 'label':
                    addLabel(data.messages, data.labels, data.alsoArchive);
                    break;
                case 'folder':
                    folder(data.messageIDs, data.folderID);
                    break;
                default:
                    break;
            }
        });

        function folder(messageIDs = [], folderID = '') {
            const displaySuccess = () => notifySuccess(gettextCatalog.getPlural(messageIDs.length, 'Message moved', 'Messages moved', null));
            const promise = messageApi.label(folderID, 1, messageIDs)
            .then(() => eventManager.call())
            .then(() => displaySuccess());
            networkActivityTracker.track(promise);
        }

        function updateLabelsAdded(Type, mailbox) {
            const list = [CONSTANTS.MAILBOX_IDENTIFIERS[mailbox]];
            switch (Type) {
                // This message is a draft, if you move it to trash and back to inbox, it will go to draft instead
                case CONSTANTS.DRAFT: {
                    list.push(CONSTANTS.MAILBOX_IDENTIFIERS.drafts);
                    break;
                }
                // This message is sent, if you move it to trash and back, it will go back to sent
                case CONSTANTS.SENT: {
                    list.push(CONSTANTS.MAILBOX_IDENTIFIERS.sent);
                    break;
                }
                // Type 3 is inbox and sent, (a message sent to yourself), if you move it from trash to inbox, it will acquire both the inbox and sent labels ( 0 and 2 ).
                case CONSTANTS.INBOX_AND_SENT:
                    list.push(CONSTANTS.MAILBOX_IDENTIFIERS.sent);
                    break;
            }
            return list;
        }


        // Message actions
        function move({ ids, mailbox }) {
            const exclusiveLabels = labelsModel.ids('folders');
            const folderIDs = [
                CONSTANTS.MAILBOX_IDENTIFIERS.inbox,
                CONSTANTS.MAILBOX_IDENTIFIERS.trash,
                CONSTANTS.MAILBOX_IDENTIFIERS.spam,
                CONSTANTS.MAILBOX_IDENTIFIERS.archive
            ].concat(exclusiveLabels);
            const toTrash = mailbox === 'trash';
            const events = _.chain(ids)
                .map((id) => {
                    const message = cache.getMessageCached(id) || {};
                    let labelIDs = message.LabelIDs || [];
                    const labelIDsAdded = updateLabelsAdded(message.Type, mailbox);
                    const labelIDsRemoved = labelIDs.filter((labelID) => folderIDs.indexOf(labelID) > -1);

                    if (Array.isArray(labelIDsRemoved)) {
                        labelIDs = _.difference(labelIDs, labelIDsRemoved);
                    }

                    if (Array.isArray(labelIDsAdded)) {
                        labelIDs = _.uniq(labelIDs.concat(labelIDsAdded));
                    }

                    return {
                        Action: 3,
                        ID: id,
                        Message: {
                            ID: id,
                            ConversationID: message.ConversationID,
                            Selected: false,
                            LabelIDs: labelIDs,
                            IsRead: toTrash ? 1 : message.IsRead
                        }
                    };

                })
                .reduce((acc, event) => (acc[event.ID] = event, acc), {})
                .reduce((acc, event, i, eventList) => {

                    const conversation = cache.getConversationCached(event.Message.ConversationID);
                    const messages = cache.queryMessagesCached(event.Message.ConversationID);

                    acc.push(event);

                    if (conversation && Array.isArray(messages)) {
                        const labelIDs = _.chain(messages)
                            .reduce((acc, { ID, LabelIDs }) => {
                                const list = eventList[ID] ? eventList[ID].Message.LabelIDs : LabelIDs;
                                return acc.concat(list);
                            }, [])
                            .uniq()
                            .value();

                        acc.push({
                            Action: 3,
                            ID: conversation.ID,
                            Conversation: {
                                ID: conversation.ID,
                                LabelIDs: labelIDs
                            }
                        });
                    }

                    return acc;

                }, [])
                .value();

             // Send request
            const promise = messageApi[mailbox]({ IDs: ids });
            cache.addToDispatcher(promise);

            const message = gettextCatalog.getPlural(ids.length, 'Message moved to', 'Messages moved to', null);
            const notification = `${message} ${getFolderNameTranslated(mailbox)}`;

            if (tools.cacheContext()) {
                cache.events(events);
                return notifySuccess(notification);
            }

            // Send cache events
            promise.then(() => (cache.events(events), notifySuccess(notification)));
            networkActivityTracker.track(promise);
        }

        /**
         * Detach a label from a message
         * @param  {String} messageID
         * @param  {String} conversationID
         * @param  {String} labelID
         * @return {void}
         */
        function detachLabel(messageID, conversationID, labelID) {
            const events = [];
            const messages = cache.queryMessagesCached(conversationID);

            // Generate event for the message
            events.push({ Action: 3, ID: messageID, Message: { ID: messageID, LabelIDsRemoved: [labelID] } });

            const LabelIDs = _.chain(messages)
                .reduce((acc, { ID, LabelIDs = [] }) => {
                    if (ID === messageID) {
                        return acc.concat(LabelIDs.filter((id) => id !== labelID));
                    }
                    return acc.concat(LabelIDs);
                }, [])
                .uniq()
                .value();

            events.push({
                Action: 3,
                ID: conversationID,
                Conversation: {
                    ID: conversationID,
                    LabelIDs
                }
            });

            // Send to cache manager
            cache.events(events);

            // Send request to detach the label
            messageApi.label(labelID, REMOVE_ID, [messageID]);
        }

        /**
         * Apply labels on a list of messages
         * @param {Array} messages
         * @param {Array} labels
         * @param {Boolean} alsoArchive
         */
        function addLabel(messages, labels, alsoArchive) {
            const context = tools.cacheContext();
            const current = tools.currentLocation();
            const currentMailbox = tools.currentMailbox();
            const ids = _.map(messages, ({ ID }) => ID);

            const process = (events) => {
                cache.events(events).then(() => {
                    const getLabelsIDS = ({ ConversationID }) => {
                        return _.chain(cache.queryMessagesCached(ConversationID) || [])
                            .reduce((acc, { LabelIDs = [] }) => acc.concat(LabelIDs), [])
                            .uniq()
                            .value();
                    };

                    const events2 = _.chain((messages))
                        .map((message) => ({
                            message,
                            conversation: cache.getConversationCached(message.ConversationID)
                        }))
                        .filter(({ conversation }) => conversation)
                        .map(({ message, conversation }) => {
                            conversation.LabelIDs = getLabelsIDS(message);
                            return {
                                Action: 3,
                                ID: conversation.ID,
                                Conversation: conversation
                            };
                        })
                        .value();

                    cache.events(events2);

                    if (alsoArchive === true) {
                        messageApi.archive({ IDs: ids }); // Send request to archive conversations
                    }
                });
            };

            const filterLabelsID = (list = [], cb = angular.noop) => {
                return _.chain(list)
                    .filter(cb)
                    .map(({ ID }) => ID)
                    .value();
            };

            const mapPromisesLabels = (list = [], Action) => {
                return _.map(list, (id) => messageApi.label(id, Action, ids));
            };

            const { events, promises } = _.reduce(messages, (acc, message) => {

                const msgLabels = (message.LabelIDs || []).filter((v) => isNaN(+v));
                const toApply = filterLabelsID(labels, ({ ID, Selected }) => Selected && !_.contains(msgLabels, ID));
                const toRemove = filterLabelsID(labels, ({ ID, Selected }) => !Selected && _.contains(msgLabels, ID));

                if (alsoArchive === true) {
                    toApply.push(CONSTANTS.MAILBOX_IDENTIFIERS.archive);

                    if (currentMailbox !== 'label' && currentMailbox !== 'starred') {
                        toRemove.push(current);
                    }
                }

                acc.events.push({
                    Action: 3,
                    ID: message.ID,
                    Message: {
                        ID: message.ID,
                        IsRead: message.IsRead,
                        ConversationID: message.ConversationID,
                        Selected: false,
                        LabelIDsAdded: toApply,
                        LabelIDsRemoved: toRemove
                    }
                });

                acc.promises = acc.promises
                    .concat(mapPromisesLabels(toApply, ADD_ID))
                    .concat(mapPromisesLabels(toRemove, REMOVE_ID));

                return acc;
            }, { events: [], promises: [] });

            const promise = $q.all(promises);
            cache.addToDispatcher(promise);

            if (context === true) {
                return process(events);
            }

            promise.then(() => process(events));
            networkActivityTracker.track(promise);
        }

        /**
         * Star a message
         * @param {Array} ids
         */
        function star(ids) {
            const promise = messageApi.star({ IDs: ids });
            const LabelIDsAdded = [CONSTANTS.MAILBOX_IDENTIFIERS.starred];

            cache.addToDispatcher(promise);

            if (!tools.cacheContext()) {
                promise.then(eventManager.call());
                return networkActivityTracker.track(promise);
            }

            const events = _.chain(ids)
            .map((id) => cache.getMessageCached(id))
            .filter(Boolean)
            .reduce((acc, { ID, ConversationID, IsRead }) => {
                const conversation = cache.getConversationCached(ConversationID);

                // Messages
                acc.push({
                    Action: 3, ID,
                    Message: { ID, IsRead, LabelIDsAdded }
                });

                // Conversation
                if (conversation) {
                    acc.push({
                        Action: 3,
                        ID: ConversationID,
                        Conversation: {
                            ID: ConversationID,
                            LabelIDsAdded,
                            NumUnread: conversation.NumUnread
                        }
                    });
                }

                return acc;
            }, [])
            .value();

            cache.events(events);
        }

        /**
         * Unstar a message
         * @param {Array} ids
         */
        function unstar(ids) {
            const promise = messageApi.unstar({ IDs: ids });
            const LabelIDsRemoved = [CONSTANTS.MAILBOX_IDENTIFIERS.starred];

            cache.addToDispatcher(promise);

            if (!tools.cacheContext()) {
                promise.then(eventManager.call());
                return networkActivityTracker.track(promise);
            }

            const events = _.chain(ids)
            .map((id) => cache.getMessageCached(id))
            .filter(Boolean)
            .reduce((acc, { ID, ConversationID, IsRead }) => {
                const conversation = cache.getConversationCached(ConversationID);
                const messages = cache.queryMessagesCached(ConversationID);
                const stars = _.filter(messages, ({ LabelIDs = [] }) => _.contains(LabelIDs, CONSTANTS.MAILBOX_IDENTIFIERS.starred));

                // Messages
                acc.push({
                    Action: 3, ID,
                    Message: { ID, IsRead, LabelIDsRemoved }
                });

                // Conversation
                if (stars.length === 1 && conversation) {
                    acc.push({
                        Action: 3,
                        ID: ConversationID,
                        Conversation: {
                            ID: ConversationID,
                            LabelIDsRemoved,
                            NumUnread: conversation.NumUnread
                        }
                    });
                }
                return acc;
            }, [])
            .value();

            cache.events(events);
        }

        /**
         * Mark as read a list of messages
         * @param {Array} ids
         */
        function read(ids = []) {

            // Generate message event
            const { messageIDs, conversationIDs, events } = _
                .reduce(ids, (acc, ID) => {
                    const { IsRead, ConversationID } = cache.getMessageCached(ID) || {};

                    if (IsRead === 0) {
                        acc.conversationIDs.push(ConversationID);
                        acc.events.push({
                            Action: 3, ID,
                            Message: { ID, ConversationID, IsRead: 1 }
                        });
                        acc.messageIDs.push(ID);
                    }

                    return acc;
                }, { messageIDs: [], conversationIDs: [], events: [] });

            if (!messageIDs.length) {
                return;
            }

            // Generate conversation event
            _.chain(conversationIDs)
                .uniq()
                .map((id) => cache.getConversationCached(id))
                .filter(Boolean)
                .each((conversation) => {
                    const messages = cache.queryMessagesCached(conversation.ID);
                    const filtered = _.filter(messages, ({ ID }) => _.contains(messageIDs, ID));

                    events.push({
                        Action: 3,
                        ID: conversation.ID,
                        Conversation: {
                            ID: conversation.ID,
                            NumUnread: conversation.NumUnread - filtered.length
                        }
                    });
                });

            // Send request
            const promise = messageApi.read({ IDs: messageIDs });
            cache.addToDispatcher(promise);

            if (tools.cacheContext() === true) {
                // Send cache events
                return cache.events(events);
            }
            // Send cache events
            promise.then(() => cache.events(events));
            networkActivityTracker.track(promise);
        }

        /**
         * Mark as unread a list of messages
         * @param {Array} ids
         */
        function unread(ids = []) {
            const context = tools.cacheContext();
            const promise = messageApi.unread({ IDs: ids });

            cache.addToDispatcher(promise);

            if (!context) {
                promise
                    .then(() => {
                        // Update the cache to trigger an update (UI)
                        _.each(ids, (id) => {
                            const msg = cache.getMessageCached(id) || {};
                            msg.IsRead = 0;
                            cache.updateMessage(msg);
                        });
                    })
                    .then(() => eventManager.call());
                return networkActivityTracker.track(promise);
            }

            const { messageIDs, conversationIDs, events } = _
                .reduce(ids, (acc, ID) => {
                    const { IsRead, ConversationID } = cache.getMessageCached(ID) || {};

                    if (IsRead === 1) {
                        acc.conversationIDs.push(ConversationID);
                        acc.events.push({
                            Action: 3, ID,
                            Message: {
                                ID, ConversationID, IsRead: 0
                            }
                        });
                        acc.messageIDs.push(ID);
                    }

                    return acc;
                }, { messageIDs: [], conversationIDs: [], events: [] });

            if (messageIDs.length) {
                // Generate conversation event
                _.chain(conversationIDs)
                    .uniq()
                    .map((id) => cache.getConversationCached(id))
                    .filter(Boolean)
                    .each((conversation) => {
                        const messages = cache.queryMessagesCached(conversation.ID);
                        const filtered = _.filter(messages, ({ ID }) => _.contains(messageIDs, ID));

                        events.push({
                            Action: 3,
                            ID: conversation.ID,
                            Conversation: {
                                ID: conversation.ID,
                                NumUnread: conversation.NumUnread + filtered.length
                            }
                        });
                    });
            }

            cache.events(events);
        }

        /**
         * Delete a list of messages
         * @param {Array} ids
         */
        function destroy(ids) {
            const events = [];

            // Generate cache events
            _.each(ids, (id) => {
                const message = cache.getMessageCached(id);
                const conversation = cache.getConversationCached(message.ConversationID);

                if (angular.isDefined(conversation)) {
                    if (conversation.NumMessages === 1) {
                        // Delete conversation
                        events.push({ Action: 0, ID: conversation.ID });
                    } else if (conversation.NumMessages > 1) {
                        const messages = cache.queryMessagesCached(conversation.ID);
                        const labelIDs = _.chain(messages)
                            .filter(({ ID }) => ID !== id)
                            .reduce((acc, { LabelIDs = [] }) => acc.concat(LabelIDs), [])
                            .uniq()
                            .value();

                        events.push({
                            Action: 3,
                            ID: conversation.ID,
                            Conversation: {
                                ID: conversation.ID,
                                LabelIDs: labelIDs, // Forge LabelIDs
                                NumMessages: conversation.NumMessages - 1 // Decrease the number of message
                            }
                        });
                    }
                }

                events.push({ Action: 0, ID: message.ID });
            });

            const promise = messageApi.delete({ IDs: ids });
            cache.addToDispatcher(promise);

            if (tools.cacheContext() === true) {
                return cache.events(events);
            }

            // Send cache events
            promise.then(() => cache.events(events));
            networkActivityTracker.track(promise);
        }

        /**
         * Discard draft
         * @param {Object} message
         */
        function discardMessage({ ID }) {
            destroy([ID]);
        }

        return {
            move,
            detachLabel, addLabel,
            star, unstar,
            read, unread,
            destroy, discardMessage
        };
    });
