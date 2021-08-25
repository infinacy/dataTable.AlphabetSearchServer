(function ($) {

// Search function
    $.fn.dataTable.Api.register('alphabetSearchServer()', function (searchTerm) {
        this.iterator('table', function (context) {
            context.alphabetSearch.letter = searchTerm;
            if (typeof context.ajax.data === 'undefined') {
                context.ajax.data = {alphabetSearchLetter: searchTerm};
            } else if (typeof context.ajax.data === 'function') {
                var backData = context.ajax.data;
                context.ajax.data = function (d, settings) {
                    var dUpdated = backData(d, settings);
                    if (dUpdated) {
                        //If function returns an object
                        d = dUpdated;
                    }
                    d.alphabetSearchLetter = searchTerm;
                    return d;
                };
            } else if (typeof context.ajax.data === 'object') {
                context.ajax.data.alphabetSearchLetter = searchTerm;
            }
        });

        return this;
    });

// Recalculate the alphabet display for updated data
    $.fn.dataTable.Api.register('alphabetSearchServer.recalc()', function () {
        this.iterator('table', function (context) {
            draw(
                    new $.fn.dataTable.Api(context),
                    $('div.alphabet', this.table().container()),
                    context
                    );
        });

        return this;
    });

    function draw(table, alphabet, context)
    {
        if (!context.json || !context.json.alphabetSearchData) {
            return;
        }
        alphabet.empty();

        if (context.oLanguage.alphabetSearch.infoDisplay !== '') {
            $('<span class="alphabet-info-display"></span>')
                    .html(context.oLanguage.alphabetSearch.infoDisplay)
                    .appendTo(alphabet);
        }

        var columnData = table.column(context.alphabetSearch.column, {search: 'applied'}).data();
        var bins = context.json.alphabetSearchData;

        var alphabetList = $('<ul/>');

        $('<a/>')
                .attr('href', 'javascript:;')
                .data('letter', '')
                .data('match-count', columnData.length)
                .addClass(
                        ((!context.alphabetSearch.letter) ? 'active' : '')
                        )
                .html('<span>' + context.oLanguage.alphabetSearch.infoAll + '</span>')
                .wrap('<li/>')
                .parent()
                .appendTo(alphabetList);

        for (var i = 0; i < context.oLanguage.alphabetSearch.alphabet.length; i++) {
            var letter = context.oLanguage.alphabetSearch.alphabet[i];

            $('<a/>')
                    .attr('href', 'javascript:;')
                    .data('letter', letter)
                    .data('match-count', bins[letter] || 0)
                    .addClass(
                            (!bins[letter] ? 'empty' : '')
                            + ((context.alphabetSearch.letter === letter) ? ' active' : '')
                            )
                    .html('<span>' + letter + '</span>')
                    .wrap('<li/>')
                    .parent()
                    .appendTo(alphabetList);
        }

        alphabetList.appendTo(alphabet);

        $('<div class="alphabet-info"></div>')
                .appendTo(alphabet);
    }


    $.fn.dataTable.AlphabetSearchServer = function (context) {
        var table = new $.fn.dataTable.Api(context);
        var alphabet = $('<div class="alphabet"/>');

        // Language
        context.oLanguage.alphabetSearch =
                $.extend(
                        {
                            'alphabet': '#ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                            'infoDisplay': 'Display:',
                            'infoAll': 'All'
                        },
                        ((context.oLanguage.alphabetSearch)
                                ? context.oLanguage.alphabetSearch
                                : {}
                        )
                        );
        // Convert alphabet to uppercase
        context.oLanguage.alphabetSearch.alphabet.toUpperCase();

        context.alphabetSearch =
                $.extend(
                        {
                            column: 0
                        },
                        $.isPlainObject(context.oInit.alphabetSearch) ? context.oInit.alphabetSearch : {},
                        {
                            letter: '',
                            letterSearch: '',
                            pass: 0
                        }
                );

        // Set required "orderDataType" ("sSortDataType") for a column
        if (context.alphabetSearch.column >= 0 && context.alphabetSearch.column < context.aoColumns.length) {
            context.aoColumns[context.alphabetSearch.column].sSortDataType = 'alphabetSearch';
        }

        if (typeof context.ajax.data === 'undefined') {
            context.ajax.data = {alphabetSearchColumn: context.alphabetSearch.column};
        } else if (typeof context.ajax.data === 'function') {
            var backData = context.ajax.data;
            context.ajax.data = function (d, settings) {
                var dUpdated = backData(d, settings);
                if (dUpdated) {
                    //If function returns an object
                    d = dUpdated;
                }
                d.alphabetSearchColumn = context.alphabetSearch.column;
                return d;
            };
        } else if (typeof context.ajax.data === 'object') {
            context.ajax.data.alphabetSearchColumn = context.alphabetSearch.column;
        }

        if (context.hasOwnProperty('aaSortingFixed')
                && typeof context.aaSortingFixed === 'object')
        {
            if ($.isArray(context.aaSortingFixed)) {
                if (context.aaSortingFixed.length && !$.isArray(context.aaSortingFixed[0])) {
                    // 1D array
                    context.aaSortingFixed = [[context.alphabetSearch.column, 'asc'], context.aaSortingFixed];

                } else {
                    // 2D array
                    context.aaSortingFixed.unshift([context.alphabetSearch.column, 'asc']);
                }
            } else {
                if (!context.aaSortingFixed.hasOwnProperty('pre')) {
                    context.aaSortingFixed.pre = [];
                }

                if (context.aaSortingFixed.pre.length && !$.isArray(context.aaSortingFixed.pre[0])) {
                    // 1D array
                    context.aaSortingFixed.pre = [[context.alphabetSearch.column, 'asc'], context.aaSortingFixed.pre];

                } else {
                    // 2D array
                    context.aaSortingFixed.pre.unshift([context.alphabetSearch.column, 'asc']);
                }
            }

        } else {
            context.aaSortingFixed = [context.alphabetSearch.column, 'asc'];
        }

        draw(table, alphabet, context);

        // Trigger a search
        alphabet.on('click', 'a', function (e) {
            // Prevent default behavior
            e.preventDefault();

            alphabet.find('.active').removeClass('active');
            $(this).addClass('active');

            table
                    .alphabetSearchServer($(this).data('letter'))
                    .draw();
        });

        // Mouse events to show helper information
        alphabet
                .on('mouseenter', 'a', function () {
                    var $el = $(this);
                    var el_pos = $el.position();

                    var $alphabet_info = $('.alphabet-info', alphabet);

                    $alphabet_info.html($el.data('match-count'));

                    // Display helper centered horizontally under the letter
                    $alphabet_info
                            .css({
                                opacity: 1,
                                left: el_pos.left + Math.round(($el.outerWidth() - $alphabet_info.outerWidth()) / 2),
                                top: $(this).position().top + $el.outerHeight()
                            });
                })
                .on('mouseleave', 'a', function () {
                    alphabet
                            .find('div.alphabet-info')
                            .css('opacity', 0);
                });

        // Handle table draw event
        table.on('draw.dt.dtAlphabetSearch', function (e, context) {
            var api = new $.fn.dataTable.Api(context);

            api.alphabetSearchServer.recalc();

            // Total number of column nodes
            var col_total = api.columns().nodes().length;

            var rows = api.rows({page: 'current'}).nodes();
            var group_last = null;

            api.column(context.alphabetSearch.column, {page: 'current'}).data().each(function (name, index) {
                if (name) {
                    var group = name.toString().replace(/<.*?>/g, '').charAt(0).toUpperCase();

                    if (group_last !== group) {
                        $(rows).eq(index).before(
                                '<tr class="alphabet-group"><td colspan="' + col_total + '">' + group + '</td></tr>'
                                );

                        group_last = group;
                    }
                }
            });

            // If there are no rows found and letter is selected
            if (!rows.length && context.alphabetSearch) {
                var letter = context.alphabetSearch.letter;

                $(api.table().body()).prepend(
                        '<tr class="alphabet-group"><td colspan="' + col_total + '">' + letter + '</td></tr>'
                        );
            }
        });

        // Handle table destroy event
        table.on('destroy.dt.dtAlphabetSearch', function (e, context) {
            var api = new $.fn.dataTable.Api(context);
            api.off('.dtAlphabetSearch');
        });

        // API method to get the alphabet container node
        this.node = function () {
            return alphabet;
        };
    };

    $.fn.DataTable.AlphabetSearchServer = $.fn.dataTable.AlphabetSearchServer;


// Register a search plug-in
    $.fn.dataTable.ext.feature.push({
        fnInit: function (settings) {
            var search = new $.fn.dataTable.AlphabetSearchServer(settings);
            return search.node();
        },
        cFeature: 'S'
    });


}(jQuery));