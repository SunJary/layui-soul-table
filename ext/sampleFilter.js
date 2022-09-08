/**
 *
 * @name:  表格筛选扩展
 * @author: yelog
 * @link: https://github.com/yelog/layui-soul-table
 * @license: MIT
 * @version: v1.6.4
 */
layui.define(['table', 'form', 'laydate', 'util', 'excel', 'laytpl'], function (exports) {

  var $ = layui.jquery,
      table = layui.table,
      form = layui.form,
      laydate = layui.laydate,
      laytpl = layui.laytpl,
      util = layui.util,
      excel = layui.excel,
      columnsTimeOut,
      dorpListTimeOut,
      conditionTimeOut,
      bfColumnTimeOut,
      bfCond1TimeOut,
      isFilterReload = {},
      SOUL_ROW_INDEX = 'SOUL_ROW_INDEX',
      cache = {},
      HIDE = 'layui-hide',
      maxId = 1,
      UNHANDLED_VALUES = [undefined, '', null],
      where_cache = {},
      isFilterCache = {},
      table_cache = {},
      dateTimeItems = {
        'all': '全部',
        'yesterday': '昨天',
        'thisWeek': '本周',
        'lastWeek': '上周',
        'thisMonth': '本月',
        'thisYear': '今年'
      },
      itemsMap = {
        'column': 'soul-column',
        'data': 'soul-dropList',
        'condition': 'soul-condition',
        'excel': 'soul-export',
        'clearCache': 'soul-clear-cache',
      },
      modeMapItems = {
        'in': 'data',
        'condition': 'condition',
        'date': 'condition',
      },
      revertMode = {
        'data': {
          'mode': 'condition',
          'type': 'eq',
          'value': '',
        },
        'condition': {
          'mode': 'in',
          'values': [],
        },
      };

  function searchInput(value) {
    if (typeof value === "undefined") {
      value = '';
    }
    return '<input type="text" autocomplete="off" id="soul-filter-sample-search" style="width: 100px;" value="' + value + '" >'
  }

  // 封装方法
  var mod = {
    /**
     * 摧毁render数据
     * @param myTables
     */
    destroy: function (myTables) {
      if (myTables) {
        if (Array.isArray(myTables)) {
          for (var i = 0; i < myTables.length; i++) {
            deleteRender(myTables[i])
          }
        } else {
          deleteRender(myTables);
        }
      }

      function deleteRender(myTable) {
        if (!myTable) {
          return;
        }
        var tableId = myTable.config.id;
        $('#soul-filter-list' + tableId).remove();

        delete isFilterReload[tableId];
        delete where_cache[tableId];
        delete table_cache[tableId];
      }
    },
    clearFilter: function (myTable) {
      if (typeof myTable === 'string') {
        myTable = table_cache[myTable]
      }
      if (!where_cache[myTable.id] || !where_cache[myTable.id].filterSos || where_cache[myTable.id].filterSos === "[]") {
        return;
      }
      where_cache[myTable.id].filterSos = "[]"
      this.soulReload(myTable, true)
      if (table_cache[myTable.id].where && table_cache[myTable.id].where.filterSos && table_cache[myTable.id].where.filterSos !== "[]") {
        table_cache[myTable.id].where.filterSos = "[]"
      }
    },
    render: function (myTable) {
      var _this = this,
          $table = $(myTable.elem),
          $tableMain = $table.next().children('.layui-table-box').children('.layui-table-main'),
          $tableHead = $table.next().children('.layui-table-box').children('.layui-table-header').children('table'),
          $fixedLeftTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-l').children('.layui-table-header').children('table'),
          $fixedRigthTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-r').children('.layui-table-header').children('table'),
          tableId = myTable.id,
          columns = _this.getCompleteCols(myTable.cols),
          needFilter = false, // 是否存在筛选列需要进行初始化
          initFilter = false, // 是否为第一次筛选
          mainExcel = typeof myTable.excel === 'undefined' || ((myTable.excel && (typeof myTable.excel.on === 'undefined' || myTable.excel.on)) ? myTable.excel : false),
          i, j;

      for (i = 0; i < columns.length; i++) {
        if (columns[i].field && columns[i].filter) {
          needFilter = true;
          if ($tableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.soul-table-filter').length === 0) {
            initFilter = true;
            if ($tableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').length > 0) {
              $tableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').hide()
              $tableHead.find('th[data-field="' + columns[i].field + '"]').children().append('<span class="layui-table-sort soul-table-filter layui-inline" data-items="' + (columns[i].filter.items ? columns[i].filter.items.join(',') : '') + '" data-column="' + columns[i].field + '" lay-sort="' + $tableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').attr('lay-sort') + '" ' + (typeof columns[i].filter.split === 'undefined' ? '' : 'data-split="' + columns[i].filter.split + '"') + '><i class="soul-icon soul-icon-filter"></i><i class="soul-icon soul-icon-filter-asc"></i><i class="soul-icon soul-icon-filter-desc"></i></span>')
            } else {
              $tableHead.find('th[data-field="' + columns[i].field + '"]').children().append('<span class="soul-table-filter layui-inline" data-items="' + (columns[i].filter.items ? columns[i].filter.items.join(',') : '') + '" data-column="' + columns[i].field + '" ' + (typeof columns[i].filter.split === 'undefined' ? '' : 'data-split="' + columns[i].filter.split + '"') + '><i class="soul-icon soul-icon-filter"></i><i class="soul-icon soul-icon-filter-asc"></i><i class="soul-icon soul-icon-filter-desc"></i></span>')
            }
            if ($fixedLeftTableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').length > 0) {
              $fixedLeftTableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').hide()
              $fixedLeftTableHead.find('th[data-field="' + columns[i].field + '"]').children().append('<span class="layui-table-sort soul-table-filter layui-inline" data-items="' + (columns[i].filter.items ? columns[i].filter.items.join(',') : '') + '" data-column="' + columns[i].field + '" lay-sort="' + $fixedLeftTableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').attr('lay-sort') + '" ' + (typeof columns[i].filter.split === 'undefined' ? '' : 'data-split="' + columns[i].filter.split + '"') + '><i class="soul-icon soul-icon-filter"></i><i class="soul-icon soul-icon-filter-asc"></i><i class="soul-icon soul-icon-filter-desc"></i></span>')
            } else {
              $fixedLeftTableHead.find('th[data-field="' + columns[i].field + '"]').children().append('<span class="soul-table-filter layui-inline" data-items="' + (columns[i].filter.items ? columns[i].filter.items.join(',') : '') + '" data-column="' + columns[i].field + '" ' + (typeof columns[i].filter.split === 'undefined' ? '' : 'data-split="' + columns[i].filter.split + '"') + '><i class="soul-icon soul-icon-filter"></i><i class="soul-icon soul-icon-filter-asc"></i><i class="soul-icon soul-icon-filter-desc"></i></span>')
            }
            if ($fixedRigthTableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').length > 0) {
              $fixedRigthTableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').hide()
              $fixedRigthTableHead.find('th[data-field="' + columns[i].field + '"]').children().append('<span class="layui-table-sort soul-table-filter layui-inline" data-items="' + (columns[i].filter.items ? columns[i].filter.items.join(',') : '') + '" data-column="' + columns[i].field + '" lay-sort="' + $fixedRigthTableHead.find('th[data-field="' + columns[i].field + '"]').children().children('.layui-table-sort').attr('lay-sort') + '" ' + (typeof columns[i].filter.split === 'undefined' ? '' : 'data-split="' + columns[i].filter.split + '"') + '><i class="soul-icon soul-icon-filter"></i><i class="soul-icon soul-icon-filter-asc"></i><i class="soul-icon soul-icon-filter-desc"></i></span>')
            } else {
              $fixedRigthTableHead.find('th[data-field="' + columns[i].field + '"]').children().append('<span class="soul-table-filter layui-inline" data-items="' + (columns[i].filter.items ? columns[i].filter.items.join(',') : '') + '" data-column="' + columns[i].field + '" ' + (typeof columns[i].filter.split === 'undefined' ? '' : 'data-split="' + columns[i].filter.split + '"') + '><i class="soul-icon soul-icon-filter"></i><i class="soul-icon soul-icon-filter-asc"></i><i class="soul-icon soul-icon-filter-desc"></i></span>')
            }
          }
        }
      }
      table_cache[myTable.id] = myTable // 缓存table配置
      isFilterCache[myTable.id] = needFilter;
      if (!needFilter) {
        // 缓存所有数据
        if (myTable.url && !myTable.page) {
          // 修复不分页时，前端筛选后，data不为空，造成所有数据丢失的问题
          cache[myTable.id] = layui.table.cache[myTable.id]
        } else {
          cache[myTable.id] = myTable.data || layui.table.cache[myTable.id]
        }
        return;
      } //如果没筛选列，直接退出

      /**
       * 不重载表头数据，重新绑定事件后结束
       */
      if (!initFilter || isFilterReload[myTable.id] || myTable.isSoulFrontFilter) {
        isFilterReload[myTable.id] = false
        myTable['isSoulFrontFilter'] = false
        // 同步选中状态
        if (!myTable.url && myTable.page && myTable.data) {
          myTable.data.forEach(function (row) {
            for (i = 0; i < cache[myTable.id].length; i++) {
              if (cache[myTable.id][i][SOUL_ROW_INDEX] === row[SOUL_ROW_INDEX]) {
                cache[myTable.id][i] = row
                break;
              }
            }
          })
        }
        this.bindFilterClick(myTable);
        return;
      } else {
        if (!myTable.url && myTable.page && myTable.data && myTable.data.length > myTable.limit) {
          // 前端分页大于一页，修复 index （用于排序恢复时需要通过这个排序）
          layui.each(myTable.data, function (index, item) {
            item[myTable.indexName] = index;
          })
        }
        /**
         * 缓存所有数据
         */
        if (myTable.url && !myTable.page) {
          // 修复不分页时，前端筛选后，data不为空，造成所有数据丢失的问题
          cache[myTable.id] = layui.table.cache[myTable.id]
        } else {
          cache[myTable.id] = myTable.data || layui.table.cache[myTable.id]
        }
        // 给表格数据添加位置标志
        cache[myTable.id].forEach(function (item, index) {
          item[SOUL_ROW_INDEX] = index
        })

        if (myTable.filter && myTable.filter.clearFilter) {
          if (myTable.where && myTable.where.filterSos && JSON.parse(myTable.where.filterSos).length > 0) {
            // 重新查询新数据
            myTable.where.filterSos = '[]';
            where_cache[myTable.id] = myTable.where || {}
            _this.soulReload(myTable, false);
            return;
          } else {
            where_cache[myTable.id] = myTable.where || {}
          }
        } else if ((typeof myTable.url !== 'undefined' && myTable.page ? typeof myTable.where.filterSos === 'undefined' : true) && where_cache[myTable.id] && JSON.parse(where_cache[myTable.id].filterSos || '[]').length > 0) {
          myTable.where['filterSos'] = where_cache[myTable.id].filterSos
          where_cache[myTable.id] = myTable.where;
          _this.soulReload(myTable, false);
          return;
        } else {
          where_cache[myTable.id] = myTable.where || {}
        }
      }

      // 第一次渲染时，追加数据
      if ($('#soul-filter-list' + tableId).length === 0) {

        if (typeof myTable.soulSort === 'undefined' || myTable.soulSort) {
          if (typeof $table.attr('lay-filter') === 'undefined') {
            $table.attr('lay-filter', tableId);
          }
          table.on('sort(' + $table.attr('lay-filter') + ')', function (obj) {

            // 同步分页信息
            myTable.limit = table_cache[myTable.id].limit

            if (myTable.url && myTable.page) {
              // 后台分页
              where_cache[myTable.id].field = obj.field;
              where_cache[myTable.id].order = obj.type;
              isFilterReload[myTable.id] = true;
              table.render($.extend(myTable, {
                initSort: obj
                , where: where_cache[myTable.id]
                , page: {
                  curr: 1 //重新从第 1 页开始
                }
              }));
            } else if (!myTable.url && myTable.page) {
              // 前台分页
              if (obj.type === 'asc') { //升序
                cache[myTable.id] = layui.sort(cache[myTable.id], obj.field)
              } else if (obj.type === 'desc') { //降序
                cache[myTable.id] = layui.sort(cache[myTable.id], obj.field, true)
              } else { //清除排序
                cache[myTable.id] = layui.sort(cache[myTable.id], myTable.indexName)
              }
              myTable.initSort = obj;
              myTable.page = {curr: 1};
              _this.soulReload(myTable, false)
            }
          });
        }

        var soulFilterList = []
        soulFilterList.push('<div id="soul-filter-list' + tableId + '"><form action="" class="layui-form" lay-filter="orm">');
        soulFilterList.push('<input style="display: none">');
        soulFilterList.push('<div id="soul-filter-sample' + tableId + '" style="display: none">');
        soulFilterList.push('<div style="display: flex;">');
        soulFilterList.push('<div class="search-sample-input" id="soul-filter-sample-input"></div>');
        soulFilterList.push('<button type="button" id="soul-filter-sample-btn" class="layui-btn layui-btn-sm" data-type="search"><i class="layui-icon">&#xe615;</i></button>');
        soulFilterList.push('</div>');
        soulFilterList.push('<div id="soul-filter-clear-btn" class="search-clear-input">清空</div>');
        soulFilterList.push('</div>');

        var types = {}; //存储过滤数据的类型
        // 根据表格列显示
        for (i = 0; i < columns.length; i++) {

          //存储过滤数据的类型
          if (columns[i].filter && columns[i].filter.type) {
            if (columns[i].filter.field) {
              types[columns[i].filter.field] = columns[i].filter.type;
            } else {
              types[columns[i].field] = columns[i].filter.type;
            }
          }
        }
        if (JSON.stringify(types).length !== 2) {
          myTable.where['tableFilterType'] = JSON.stringify(types);
        }

        soulFilterList.push('</form></div>');
        $('body').append(soulFilterList.join(''));


      } else {

        types = {}; //存储过滤数据的类型
        // 根据表格列显示
        for (i = 0; i < columns.length; i++) {
          if (columns[i].type === 'checkbox' || !columns[i].field) {
            continue;
          }
          //存储过滤数据的类型
          if (columns[i].filter && columns[i].filter.type) {
            if (columns[i].filter.field) {
              types[columns[i].filter.field] = columns[i].filter.type;
            } else {
              types[columns[i].field] = columns[i].filter.type;
            }
          }
        }
        if (JSON.stringify(types).length !== 2) {
          myTable.where['tableFilterType'] = JSON.stringify(types);
        }

      }

      $('#soul-filter-sample-btn').off('click').on('click', function (e) {
        _this.soulReload(myTable);
      })

      this.bindFilterClick(myTable);
    }
    , bindFilterClick: function (myTable) {
      var _this = this,
          $table = $(myTable.elem),
          $tableHead = $table.next().children('.layui-table-box').children('.layui-table-header').children('table'),
          $fixedLeftTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-l').children('.layui-table-header').children('table'),
          $fixedRigthTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-r').children('.layui-table-header').children('table'),
          tableId = myTable.id,
          mainListTimeOut;

      // 显示筛选框
      $tableHead.find('.soul-table-filter').off('click').on('click', function (e) {
        e.stopPropagation();
        showFilter($(this))
      });
      $fixedLeftTableHead.find('.soul-table-filter').off('click').on('click', function (e) {
        e.stopPropagation();
        showFilter($(this))
      });
      $fixedRigthTableHead.find('.soul-table-filter').off('click').on('click', function (e) {
        e.stopPropagation();
        showFilter($(this))
      });

      function showFilter($that) {
        var field = $that.parent().parent().data('field');

        // 取上次查询的值，填充进去
        const inputVal = _this.getFieldValue(myTable, field)
        $('#soul-filter-sample-input').html(searchInput(inputVal));

        // 显示查询框
        $('#soul-filter-sample' + tableId ).show()

        // 自动聚焦
        $('#soul-filter-sample-search').focus()
        // input同步筛选条件
        $('#soul-filter-sample-search').off('input').on('input', function () {
          updateFieldWhere(field, $(this).val())
        });
        $('#soul-filter-clear-btn').off('click').on('click', function (e) {
          $('#soul-filter-sample-search').val('')
          updateFieldWhere(field, '')
        })

        $('#soul-filter-sample-search').keydown(function (e) {
          if (e.keyCode == 13) {
            _this.soulReload(myTable)
          }
        });
        // 当前行改动时，同步where条件
        function updateFieldWhere(field, value) {
          filterSo = {
            id: 0,
            prefix: 'and',
            mode: 'condition',
            field: field,
            type: 'contain',
            value: value,
            groupId: 0
          }
          _this.updateWhere(myTable, filterSo)
        }

        if (mainListTimeOut) {
          clearTimeout(mainListTimeOut)
        }
        var left, animate;
        if ($that.offset().left + $('#soul-filter-sample' + tableId).outerWidth() < document.body.clientWidth) {
          left = $that.offset().left + 10;
          animate = 'fadeInLeft';
        } else {
          left = $that.offset().left - $('#soul-filter-sample' + tableId).outerWidth();
          animate = 'fadeInRight';
        }
        $('#soul-filter-sample' + tableId).data('type', myTable.where.tableFilterType ? JSON.parse(myTable.where.tableFilterType)[$that.data('column')] || '' : '').hide().css({
          'top': $that.offset().top + 10,
          'left': left
        }).show().removeClass().addClass(animate + ' animated' + ' searchmob');

        form.render('checkbox', 'orm');
      }

      $(document).on('click', function (e) {
        _this.hideSearch(myTable)
      });
      $('#soul-filter-sample' + tableId).off('click').on('click', function (e) {
        $(this).find('.layui-form-selected').removeClass('layui-form-selected')
        e.stopPropagation();
      });


      _this.updateFilterIcon(myTable)
    }
    , updateFilterIcon: function (myTable) {
      var _this = this,
          $table = $(myTable.elem),
          $tableHead = $table.next().children('.layui-table-box').children('.layui-table-header').children('table'),
          $fixedLeftTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-l').children('.layui-table-header').children('table'),
          $fixedRigthTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-r').children('.layui-table-header').children('table'),
          tableId = myTable.id,
          where = where_cache[myTable.id] || {},
          filterSos = JSON.parse(where.filterSos ? where.filterSos : '[]');


      for (var i = 0; i < filterSos.length; i++) {
        var hasFilter = false;
        if (filterSos[i].value && filterSos[i].field && filterSos[i].value !== '') {
          hasFilter = true
        }
        _this.updateOneFilterIcon(myTable, filterSos[i].field, hasFilter)
      }
    }
    , updateOneFilterIcon: function (myTable, field, hasFilter) {
      var _this = this,
          $table = $(myTable.elem),
          $tableHead = $table.next().children('.layui-table-box').children('.layui-table-header').children('table'),
          $fixedLeftTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-l').children('.layui-table-header').children('table'),
          $fixedRigthTableHead = $table.next().children('.layui-table-box').children('.layui-table-fixed-r').children('.layui-table-header').children('table'),
          tableId = myTable.id

      $tableHead.find('thead>tr>th[data-field="' + field + '"] .soul-table-filter').attr('soul-filter', '' + hasFilter);
      $fixedLeftTableHead.find('thead>tr>th[data-field="' + field + '"] .soul-table-filter').attr('soul-filter', '' + hasFilter);
      $fixedRigthTableHead.find('thead>tr>th[data-field="' + field + '"] .soul-table-filter').attr('soul-filter', '' + hasFilter);
    }
    , resize: function (myTable) {
      var _this = this,
          $table = $(myTable.elem),
          $tableBox = $table.next().children('.layui-table-box'),
          $tableMain = $tableBox.children('.layui-table-main')
      // 减去底部筛选的高度
      if ($table.next().children('.soul-bottom-contion').length > 0) {
        $table.next().children('.soul-bottom-contion').children('.condition-items').css('width', $table.next().children('.soul-bottom-contion').width() - $table.next().children('.soul-bottom-contion').children('.editCondtion').outerWidth());

        var bodyHeight = $table.next().height() - $table.next().children('.soul-bottom-contion').outerHeight()
        if ($table.next().children('.layui-table-tool').length > 0) {
          bodyHeight = bodyHeight - $table.next().children('.layui-table-tool').outerHeight();
        }
        if ($table.next().children('.layui-table-total').length > 0) {
          bodyHeight = bodyHeight - $table.next().children('.layui-table-total').outerHeight();
        }
        if ($table.next().children('.layui-table-page').length > 0) {
          bodyHeight = bodyHeight - $table.next().children('.layui-table-page').outerHeight();
        }

        bodyHeight = bodyHeight - $table.next().children('.layui-table-box').children('.layui-table-header').outerHeight();

        $table.next().children('.layui-table-box').children('.layui-table-body').height(bodyHeight)
        var fixHeight = bodyHeight - _this.getScrollWidth($tableMain[0]),
            layMainTableHeight = $tableMain.children('table').height()
        $table.next().children('.layui-table-box').children('.layui-table-fixed').children('.layui-table-body').height(layMainTableHeight >= fixHeight ? fixHeight : 'auto')

        var scollWidth = $tableMain.width() - $tableMain.prop('clientWidth') //纵向滚动条宽度;
        $tableBox.children('.layui-table-fixed-r').css('right', scollWidth - 1);
      }
    }
    /**
     * 更新 filter 条件
     * @param myTable
     * @param filterSo
     */
    , updateWhere: function (myTable, filterSo) {
      var _this = this,
          where = where_cache[myTable.id] || {},
          filterSos = JSON.parse(where.filterSos ? where.filterSos : '[]');

      _this.updateFilterIcon(myTable)

      var hasField = false;
      var needRemoveIndex = -1;
      for (var i = 0; i < filterSos.length; i++) {
        if (filterSos[i].field === filterSo.field) {
          hasField = true
          if (filterSo.value === '') {
            _this.updateOneFilterIcon(myTable, filterSos[i].field, false)
            // 如果查询的内容为空,则删除当前查询条件
            // 因为text字段默认为null,为空的话查询条件为 like '%%',查询不到null值
            needRemoveIndex = i
          }
          if (updateFilterSo(filterSos[i], filterSo)) {
            break;
          }
        }
      }
      if (needRemoveIndex !== -1 && Array.isArray(filterSos)) {
        // 删掉空值
        filterSos.splice(needRemoveIndex, 1)
      }
      if (!hasField) {
        filterSos.push(filterSo)
      }

      where['filterSos'] = JSON.stringify(filterSos);
      myTable.where = where;
      where_cache[myTable.id] = where;

      function updateFilterSo(filterSo, newFilterSo) {
        var isMatch = false;

        if (filterSo.field === newFilterSo.field) {
          $.extend(filterSo, newFilterSo);
          isMatch = true;
        }

        return isMatch;
      }
    }
    , getWhere: function (myTable) {
      return where_cache[myTable.id] || {};
    },
    getFieldValue: function(myTable, field) {
      // 表头样式
      var where = where_cache[myTable.id] || {},
          filterSos = JSON.parse(where.filterSos ? where.filterSos : '[]');

      for (var i = 0; i < filterSos.length; i++) {
        if (field == filterSos[i].field) {
          return filterSos[i].value
        }
      }
      return ''
    }
    /**
     * 根据当前条件重载表格
     * @param myTable 需要重载的表格对象
     * @param isr 是否为筛选重载，为 true 时，不进行筛选的初始化动作（包括渲染dom、请求表头数据等）
     */
    , hideSearch: function (myTable) {
      $('#soul-filter-sample' + myTable.id).hide();

      $('#soul-filter-sample-search').off('input')
      $('#soul-filter-clear-btn').off('click')

      $('#soul-filter-sample-input').html();
    }
    , soulReload: function (myTable, isr) {
      var _this = this,
          $table = $(myTable.elem),
          scrollLeft = $table.next().children('.layui-table-box').children('.layui-table-main').scrollLeft();

      _this.hideSearch(myTable)

      isFilterReload[myTable.id] = typeof isr === 'undefined' ? true : isr;
      if (typeof myTable.url !== 'undefined' && myTable.page) {
        $table.data('scrollLeft', scrollLeft);
        /**
         * 后台筛选
         */
        table.reload(myTable.id, {
          where: where_cache[myTable.id] || {},
          page: {
            curr: 1 //重新从第 1 页开始
          }
        })
      } else {
        /**
         * 前端筛选
         */
        var where = where_cache[myTable.id] || {},
            filterSos = JSON.parse(where.filterSos ? where.filterSos : '[]'),
            tableFilterTypes = where.tableFilterType ? JSON.parse(where.tableFilterType) : {},
            loading = layer.load(2);
        if (!myTable.page) {
          // 修复前端不分页时，layui table bug 导致的只显示10条数据的问题
          myTable.limit = 100000000
        }
        if (filterSos.length > 0) {
          var newData = [];
          layui.each(cache[myTable.id], function (index, item) {
            var show = true;

            for (var i = 0; i < filterSos.length; i++) {
              show = _this.handleFilterSo(filterSos[i], item, tableFilterTypes, show, i === 0)
            }

            if (show) {
              newData.push(item)
            }
          })
          if (myTable.page) {
            table.reload(myTable.id, {
              data: newData
              , initSort: myTable.initSort
              , isSoulFrontFilter: true
              , page: {
                curr: 1 //重新从第 1 页开始
              }
            })
          } else {
            var url = myTable.url;
            $table.next().off('click')
            var inst = table.reload(myTable.id, {
              url: ''
              , initSort: myTable.initSort
              , isSoulFrontFilter: true
              , data: newData
            })
            inst.config.url = url;
          }
          myTable.data = newData

        } else {
          if (myTable.page) {
            table.reload(myTable.id, {
              data: cache[myTable.id]
              , initSort: myTable.initSort
              , isSoulFrontFilter: true
              , page: {
                curr: 1 //重新从第 1 页开始
              }
            })
          } else {
            table.reload(myTable.id, {
              data: cache[myTable.id]
              , initSort: myTable.initSort
              , isSoulFrontFilter: true
            })
          }
          myTable.data = cache[myTable.id]
        }
        $table.next().children('.layui-table-box').children('.layui-table-main').scrollLeft(scrollLeft);
        layer.close(loading)
      }
    }
    , handleFilterSo: function (filterSo, item, tableFilterTypes, show, first) {
      var isOr = first ? false : filterSo.prefix === 'or',
          field = filterSo.field,
          value = filterSo.value,
          status = true;

      // 如果有子元素
      if (filterSo.children && filterSo.children.length > 0) {
        for (var i = 0; i < filterSo.children.length; i++) {
          status = this.handleFilterSo(filterSo.children[i], item, tableFilterTypes, status, i === 0)
        }
        return isOr ? show || status : show && status;
      }

      switch (filterSo.mode) {
        case "in":
          if (filterSo.values && filterSo.values.length > 0) {
            if (filterSo.split) {
              var tempList = (item[field] + '').split(filterSo.split);
              var tempStatus = false;
              for (var i = 0; i < tempList.length; i++) {
                if (filterSo.values.indexOf(tempList[i]) !== -1) {
                  tempStatus = true;
                }
              }
              status = tempStatus;
            } else {
              status = filterSo.values.indexOf(item[field] + '') !== -1
            }
          } else {
            return show;
          }
          break;
        case "condition":
          if (filterSo.type !== 'null' && filterSo.type !== 'notNull' && (typeof value === 'undefined' || value === '')) {
            return show;
          }
          switch (filterSo.type) {
            case "eq":
              status = isNaN(item[field]) || isNaN(value) ? item[field] === value : Number(item[field]) === Number(value);
              break;
            case "ne":
              status = isNaN(item[field]) || isNaN(value) ? item[field] !== value : Number(item[field]) !== Number(value);
              break;
            case "gt":
              status = isNaN(item[field]) || isNaN(value) ? item[field] > value : Number(item[field]) > Number(value);
              break;
            case "ge":
              status = isNaN(item[field]) || isNaN(value) ? item[field] >= value : Number(item[field]) >= Number(value);
              break;
            case "lt":
              status = isNaN(item[field]) || isNaN(value) ? item[field] < value : Number(item[field]) < Number(value);
              break;
            case "le":
              status = isNaN(item[field]) || isNaN(value) ? item[field] <= value : Number(item[field]) <= Number(value);
              break;
            case "contain":
              status = (item[field] + '').indexOf(value) !== -1;
              break;
            case "notContain":
              status = (item[field] + '').indexOf(value) === -1;
              break;
            case "start":
              status = (item[field] + '').indexOf(value) === 0;
              break;
            case "end":
              var d = (item[field] + '').length - (value + '').length;
              status = d >= 0 && (item[field] + '').lastIndexOf(value) === d;
              break;
            case "null":
              status = typeof item[field] === 'undefined' || item[field] === '' || item[field] === null;
              break;
            case "notNull":
              status = typeof item[field] !== 'undefined' && item[field] !== '' && item[field] !== null;
              break;
          }
          break;
        case "date":
          var dateVal = new Date(Date.parse(item[field].replace(/-/g, "/")));
          switch (filterSo.type) {
            case 'all':
              status = true;
              break;
            case 'yesterday':
              status = item[field] && isBetween(dateVal, getToday() - 86400, getToday() - 1);
              break;
            case 'thisWeek':
              status = item[field] && isBetween(dateVal, getFirstDayOfWeek(), getFirstDayOfWeek() + 86400 * 7 - 1);
              break;
            case 'lastWeek':
              status = item[field] && isBetween(dateVal, getFirstDayOfWeek() - 86400 * 7, getFirstDayOfWeek() - 1);
              break;
            case 'thisMonth':
              status = item[field] && isBetween(dateVal, getFirstDayOfMonth(), getCurrentMonthLast());
              break;
            case 'thisYear':
              status = item[field] && isBetween(dateVal, new Date(new Date().getFullYear(), 1, 1) / 1000, new Date(new Date().getFullYear() + 1, 1, 1) / 1000 - 1);
              break;
            case 'specific':
              var dateFormat = dateVal.getFullYear();
              dateFormat += '-' + (timeAdd0(dateVal.getMonth() + 1));
              dateFormat += '-' + timeAdd0(dateVal.getDate());
              status = item[field] && dateFormat === value
              break;
          }
          break;
      }

      // 今天凌晨
      function getToday() {
        return new Date().setHours(0, 0, 0, 0) / 1000;
      }

      // 本周第一天
      function getFirstDayOfWeek() {
        var now = new Date();
        var weekday = now.getDay() || 7; //获取星期几,getDay()返回值是 0（周日） 到 6（周六） 之间的一个整数。0||7为7，即weekday的值为1-7
        return new Date(now.setDate(now.getDate() - weekday + 1)).setHours(0, 0, 0, 0) / 1000;//往前算（weekday-1）天，年份、月份会自动变化
      }

      //获取当月第一天
      function getFirstDayOfMonth() {
        return new Date(new Date().setDate(1)).setHours(0, 0, 0, 0) / 1000;
      }

      //获取当月最后一天最后一秒
      function getCurrentMonthLast() {
        var date = new Date();
        var currentMonth = date.getMonth();
        var nextMonth = ++currentMonth;
        var nextMonthFirstDay = new Date(date.getFullYear(), nextMonth, 1);
        return nextMonthFirstDay / 1000 - 1;
      }

      function isBetween(v, a, b) {
        return (v.getTime() / 1000) >= a && (v.getTime() / 1000) <= b;
      }

      function timeAdd0(str) {
        str += "";
        if (str.length <= 1) {
          str = '0' + str;
        }
        return str
      }

      return isOr ? show || status : show && status;
    }
    , getDifId: function () {
      return maxId++;
    }
    /**
     * 导出 excel 文件
     * @param myTable
     * @param curExcel
     */
    , export: function (myTable, curExcel) {
      if (typeof myTable === 'string') {
        myTable = table_cache[myTable] // tableId 转 myTable
      }
      var loading = layer.msg('文件下载中', {
        icon: 16
        , time: -1
        , anim: -1
        , fixed: false
      });
      var cols = this.deepClone(myTable.cols)
          , style = myTable.elem.next().find('style')[0]
          , sheet = style.sheet || style.styleSheet || {}
          , rules = sheet.cssRules || sheet.rules;

      layui.each(rules, function (i, item) {
        if (item.style.width) {
          var keys = item.selectorText.split('-');
          cols[keys[3]][keys[4]]['width'] = parseInt(item.style.width)
        }
      })

      var data = JSON.parse(JSON.stringify(myTable.data || cache[myTable.id])),
          showField = {},
          widths = {},
          mergeArrays = [], // 合并配置
          heightConfig = {},
          $table = $(myTable.elem),
          $tableBody = $table.next().children('.layui-table-box').children('.layui-table-body').children('table'),
          $tableTotal = myTable.totalRow ? $table.next().children('.layui-table-total').children(":first") : null,
          finalExcel = Object.assign({}, myTable.excel, curExcel);

      var filename = finalExcel.filename ? (typeof finalExcel.filename === 'function' ? finalExcel.filename.call(this) : finalExcel.filename) : '表格数据.xlsx',
          checked = finalExcel.checked === true,
          curPage = finalExcel.curPage === true,
          customColumns = finalExcel.columns,
          totalRow = finalExcel.totalRow,
          type = filename.substring(filename.lastIndexOf('.') + 1, filename.length),
          tableStartIndex = finalExcel.add && finalExcel.add.top && Array.isArray(finalExcel.add.top.data) ? finalExcel.add.top.data.length + 1 : 1,  //表格内容从哪一行开始
          bottomLength = finalExcel.add && finalExcel.add.bottom && Array.isArray(finalExcel.add.bottom.data) ? finalExcel.add.bottom.data.length : 0,// 底部自定义行数
          i, j, k;

      if (finalExcel.data){
        if(Array.isArray(finalExcel.data)) {
          data = finalExcel.data
        } else {
          console.error('导出指定数据 data 不符合数组格式', finalExcel.data)
          layer.close(loading)
          return;
        }
      } else if (checked) { // 获取选中行数据
        // data = table.checkStatus(myTable.id).data;
        data = []
        if (cache[myTable.id] && cache[myTable.id].length > 0) {
          for (i = 0; i < cache[myTable.id].length; i++) {
            if (cache[myTable.id][i][table.config.checkName]) {
              data.push(cache[myTable.id][i])
            }
          }
        }
      } else if (curPage) {
        data = layui.table.cache[myTable.id]
      } else if (myTable.url && myTable.page) {
        var ajaxStatus = true;
        var searchParam = isFilterCache[myTable.id] ? where_cache[myTable.id] : table_cache[myTable.id].where;
        if (myTable.contentType && myTable.contentType.indexOf("application/json") == 0) { //提交 json 格式
          searchParam = JSON.stringify(searchParam);
        }
        $.ajax({
          url: myTable.url,
          data: searchParam,
          dataType: 'json',
          method: myTable.method || 'post',
          async: false,
          cache: false,
          headers: myTable.headers || {},
          contentType: myTable.contentType,
          success: function (res) {
            if (typeof myTable.parseData === 'function') {
              res = myTable.parseData(res) || res;
            }
            //检查数据格式是否符合规范
            if (res[myTable.response.statusName] != myTable.response.statusCode) {
              layer.msg('返回的数据不符合规范，正确的成功状态码应为："' + myTable.response.statusName + '": ' + myTable.response.statusCode, {
                icon: 2,
                anim: 6
              });
            } else {
              data = res[myTable.response.dataName]
            }
          },
          error: function (res) {
            layer.msg('请求异常！', {icon: 2, anim: 6});
            ajaxStatus = false;
          }
        })
        if (!ajaxStatus) {
          return;
        }
      } else {
        var $sortDoom = $table.next().children('.layui-table-box').children('.layui-table-header').find('.layui-table-sort[lay-sort$="sc"]:eq(0)')
        if ($sortDoom.length > 0) {
          var sortField = $sortDoom.parent().parent().data('field');
          var sortOrder = $sortDoom.attr('lay-sort');
          switch (sortOrder) {
            case 'asc':
              data = layui.sort(data, sortField);
              break;
            case 'desc':
              data = layui.sort(data, sortField, true);
              break;
            default:
              break;
          }
        }
      }

      // 制定显示列和顺序
      var tempArray, cloneCol, columnsMap = [], curRowUnShowCount;
      for (i = 0; i < cols.length; i++) {
        curRowUnShowCount = 0;
        for (j = 0; j < cols[i].length; j++) {
          if (!cols[i][j].exportHandled) {
            if (cols[i][j].rowspan > 1) {
              if ((cols[i][j].field || cols[i][j].type === 'numbers') && !cols[i][j].hide) {
                mergeArrays.push([numberToLetter(j + 1 - curRowUnShowCount) + (i + tableStartIndex), numberToLetter(j + 1 - curRowUnShowCount) + (i + parseInt(cols[i][j].rowspan) + tableStartIndex - 1)])
              } else {
                curRowUnShowCount++;
              }
              cloneCol = this.deepClone(cols[i][j])
              cloneCol.exportHandled = true;
              k = i + 1;
              while (k < cols.length) {
                cols[k].splice(j, 0, cloneCol)
                k++
              }
            }
            if (cols[i][j].colspan > 1) {
              mergeArrays.push([numberToLetter(j + 1 - curRowUnShowCount) + (i + tableStartIndex), numberToLetter(j + parseInt(cols[i][j].colspan) - curRowUnShowCount) + (i + tableStartIndex)])
              cloneCol = this.deepClone(cols[i][j])
              cloneCol.exportHandled = true;
              for (k = 1; k < cols[i][j].colspan; k++) {
                cols[i].splice(j, 0, cloneCol)
              }
              j = j + parseInt(cols[i][j].colspan) - 1

            }
          } else if (!((cols[i][j].field || cols[i][j].type === 'numbers') && !cols[i][j].hide)) {
            curRowUnShowCount++;
          }
        }
      }
      var columns = cols[cols.length - 1]; // 获取真实列

      // 处理数据
      for (i = 0; i < data.length; i++) {
        for (j = 0; j < columns.length; j++) {
          if ((columns[j].field || columns[j].type === 'numbers') && (customColumns && Array.isArray(customColumns) || !columns[j].hide)) {
            data[i][columns[j].key] = data[i][columns[j].field || columns[j]['LAY_TABLE_INDEX']]
          }
        }
      }

      // 处理合计行
      if (totalRow !== false && myTable.totalRow) {
        var obj = {}, totalRows = {};
        if (typeof totalRow === 'object' && totalRow.type === 'origin') {
          // 通过 dom 解析
          for (i = 0; i < columns.length; i++) {
            if (columns[i].field) {
              obj[columns[i].key] = $tableTotal.find('[data-field="'+columns[i].field+'"]').text().trim()
            }
          }
          data.push(obj);
        } else {
          // 通过数据解析
          for (i = 0; i < columns.length; i++) {
            if (columns[i].totalRowText) {
              obj[columns[i].key] = columns[i].totalRowText
            } else if (columns[i].totalRow) {
              totalRows[columns[i].key] = 0
            }
          }
          if (JSON.stringify(totalRows) !== '{}') {
            for (i = 0; i < data.length; i++) {
              for (var key in totalRows) {
                totalRows[key] = (parseFloat(totalRows[key]) + (parseFloat(data[i][key]) || 0)).toFixed(2)
              }
            }
          }
          data.push(Object.assign(obj, totalRows));
        }
      }

      if (customColumns && Array.isArray(customColumns)) {
        // 自定义表头
        var tempCustomColumns = [];
        tempArray = {};
        mergeArrays = []; // 重置表头合并列
        columnsMap[0] = {};
        for (i = 0; i < customColumns.length; i++) {
          for (j = 0; j < columns.length; j++) {
            if (columns[j].field === customColumns[i]) {
              columns[j].hide = false
              tempCustomColumns.push(columns[j]);
              columnsMap[0][columns[j].key] = columns[j];
              tempArray[columns[j].key] = $('<div>'+columns[j].title+'</div>').text()
              break;
            }
          }
        }
        columns = tempCustomColumns;
        data.splice(0, 0, tempArray)
      } else {
        // 拼接表头数据
        for (i = 0; i < cols.length; i++) {
          columnsMap[i] = {}
          tempArray = {}
          for (j = 0; j < cols[i].length; j++) {
            columnsMap[i][cols[cols.length - 1][j].key] = cols[i][j];
            tempArray[cols[cols.length - 1][j].key] = $('<div>'+cols[i][j].title+'</div>').text()
          }
          data.splice(i, 0, tempArray)
        }
      }

      //添加自定义内容
      if (finalExcel.add) {
        var addTop = finalExcel.add.top,
            addBottom = finalExcel.add.bottom,
            startPos, endPos, jumpColsNum;

        if (addTop && Array.isArray(addTop.data) && addTop.data.length > 0) {

          for (i = 0; i < addTop.data.length; i++) {
            tempArray = {}, jumpColsNum = 0;
            for (j = 0; j < (addTop.data[i].length > columns.length ? addTop.data[i].length : columns.length); j++) {
              if ((columns[j].field || columns[j].type === 'numbers') && !columns[j].hide) {
                tempArray[columns[j] ? columns[j].key : j + ''] = addTop.data[i][j - jumpColsNum] || ''
              } else {
                jumpColsNum++
              }
            }
            data.splice(i, 0, tempArray);
          }

          if (Array.isArray(addTop.heights) && addTop.heights.length > 0) {
            for (i = 0; i < addTop.heights.length; i++) {
              heightConfig[i] = addTop.heights[i]
            }
          }

          if (Array.isArray(addTop.merge) && addTop.merge.length > 0) {
            for (i = 0; i < addTop.merge.length; i++) {
              if (addTop.merge[i].length === 2) {
                startPos = addTop.merge[i][0].split(',');
                endPos = addTop.merge[i][1].split(',');
                mergeArrays.push([numberToLetter(startPos[1]) + startPos[0], numberToLetter(endPos[1]) + endPos[0]])
              }

            }
          }
        }
        if (addBottom && Array.isArray(addBottom.data) && addBottom.data.length > 0) {
          for (i = 0; i < addBottom.data.length; i++) {
            tempArray = {}, jumpColsNum = 0;
            for (j = 0; j < (addBottom.data[i].length > columns.length ? addBottom.data[i].length : columns.length); j++) {
              if ((columns[j].field || columns[j].type === 'numbers') && !columns[j].hide) {
                tempArray[columns[j] ? columns[j].key : j + ''] = addBottom.data[i][j - jumpColsNum] || ''
              } else {
                jumpColsNum++
              }
            }
            data.push(tempArray);
          }

          if (Array.isArray(addBottom.heights) && addBottom.heights.length > 0) {
            for (i = 0; i < addBottom.heights.length; i++) {
              heightConfig[data.length - addBottom.data.length + i] = addBottom.heights[i]
            }
          }

          if (Array.isArray(addBottom.merge) && addBottom.merge.length > 0) {
            for (i = 0; i < addBottom.merge.length; i++) {
              if (addBottom.merge[i].length === 2) {
                startPos = addBottom.merge[i][0].split(',');
                endPos = addBottom.merge[i][1].split(',');
                mergeArrays.push([numberToLetter(startPos[1]) + (data.length - addBottom.data.length + parseInt(startPos[0])), numberToLetter(endPos[1]) + (data.length - addBottom.data.length + parseInt(endPos[0]))])
              }
            }
          }
        }
      }

      var index = 0, alignTrans = {'left': 'left', 'center': 'center', 'right': 'right'},
          borderTypes = ['top', 'bottom', 'left', 'right'];
      for (i = 0; i < columns.length; i++) {
        if ((columns[i].field || columns[i].type === 'numbers') && !columns[i].hide) {
          if (columns[i].width) {
            widths[String.fromCharCode(64 + parseInt(++index))] = columns[i].width
          }
          showField[columns[i].key] = function (field, line, data, curIndex) {
            var bgColor = 'ffffff', color = '000000', family = 'Calibri', size = 12, cellType = 's',
                bodyIndex = curIndex - (customColumns ? 1 : cols.length) - tableStartIndex + 1,
                border = {
                  top: {
                    style: 'thin',
                    color: {indexed: 64}
                  },
                  bottom: {
                    style: 'thin',
                    color: {indexed: 64}
                  },
                  left: {
                    style: 'thin',
                    color: {indexed: 64}
                  },
                  right: {
                    style: 'thin',
                    color: {indexed: 64}
                  }
                }
            if (finalExcel.border) {
              for (j = 0; j < borderTypes.length; j++) {
                if (finalExcel.border[borderTypes[j]]) {
                  border[borderTypes[j]].style = finalExcel.border[borderTypes[j]].style || border[borderTypes[j]].style
                  border[borderTypes[j]].color = handleRgb(finalExcel.border[borderTypes[j]].color) || border[borderTypes[j]].color
                } else if (finalExcel.border['color'] || finalExcel.border['style']) {
                  border[borderTypes[j]].style = finalExcel.border['style'] || border[borderTypes[j]].style
                  border[borderTypes[j]].color = handleRgb(finalExcel.border['color']) || border[borderTypes[j]].color
                }
              }
            }
            if (curIndex < tableStartIndex - 1 || curIndex >= data.length - bottomLength) {
              return {
                v: line[field] || '',
                s: {// s 代表样式
                  alignment: {
                    horizontal: 'center',
                    vertical: 'center'
                  },
                  font: {name: family, sz: size, color: {rgb: color}},
                  fill: {
                    fgColor: {rgb: bgColor, bgColor: {indexed: 64}}
                  },
                  border: border
                },
                t: cellType
              }
            } else if (bodyIndex < 0) {
              // 头部样式
              bgColor = 'C7C7C7';
              if (finalExcel.head) {
                bgColor = finalExcel.head.bgColor || bgColor;
                color = finalExcel.head.color || color;
                family = finalExcel.head.family || family;
                size = finalExcel.head.size || size;
              }
            } else {
              // 默认全局字体样式
              if (finalExcel.font) {
                bgColor = finalExcel.font.bgColor || bgColor;
                color = finalExcel.font.color || color;
                family = finalExcel.font.family || family;
                size = finalExcel.font.size || size;
              }
              // 默认全局边框样式
              if (finalExcel.border) {
                for (j = 0; j < borderTypes.length; j++) {
                  if (finalExcel.border[borderTypes[j]]) {
                    border[borderTypes[j]].style = finalExcel.border[borderTypes[j]].style || border[borderTypes[j]].style
                    border[borderTypes[j]].color = handleRgb(finalExcel.border[borderTypes[j]].color) || border[borderTypes[j]].color
                  } else if (finalExcel.border['color'] || finalExcel.border['style']) {
                    border[borderTypes[j]].style = finalExcel.border['style'] || border[borderTypes[j]].style
                    border[borderTypes[j]].color = handleRgb(finalExcel.border['color']) || border[borderTypes[j]].color
                  }
                }
              }
              // 列上配置了自定义样式
              if (columnsMap[columnsMap.length - 1][field].excel) {
                var colExcel = typeof columnsMap[columnsMap.length - 1][field].excel === 'function' ? columnsMap[columnsMap.length - 1][field].excel.call(this, line, bodyIndex, data.length - cols.length - tableStartIndex + 1 - bottomLength) : columnsMap[columnsMap.length - 1][field].excel
                if (colExcel) {
                  bgColor = colExcel.bgColor || bgColor;
                  color = colExcel.color || color;
                  family = colExcel.family || family;
                  size = colExcel.size || size;
                  cellType = colExcel.cellType || cellType;

                  if (colExcel.border) {
                    for (j = 0; j < borderTypes.length; j++) {
                      if (colExcel.border[borderTypes[j]]) {
                        border[borderTypes[j]].style = colExcel.border[borderTypes[j]].style || border[borderTypes[j]].style
                        border[borderTypes[j]].color = handleRgb(colExcel.border[borderTypes[j]].color) || border[borderTypes[j]].color
                      } else if (colExcel.border['color'] || colExcel.border['style']) {
                        border[borderTypes[j]].style = colExcel.border['style'] || border[borderTypes[j]].style
                        border[borderTypes[j]].color = handleRgb(colExcel.border['color']) || border[borderTypes[j]].color
                      }
                    }
                  }
                }
              }
            }

            function handleNull(val) {
              if (typeof val === 'undefined' || val === null) {
                return ""
              }
              return val;
            }

            var value = bodyIndex >= 0 && columnsMap[columnsMap.length - 1][field].templet ?
                typeof columnsMap[columnsMap.length - 1][field].templet === 'function' ?
                    $('<div>' + columnsMap[columnsMap.length - 1][field].templet(line) + '</div>').find(':input').length === 0 ? $('<div>' + columnsMap[columnsMap.length - 1][field].templet(line) + '</div>').text() : $tableBody.children('tbody').children('tr[data-index=' + bodyIndex + ']').children('td[data-field="' + field + '"]').find(':input').val() || handleNull(line[field])
                    : $('<div>' + laytpl($(columnsMap[columnsMap.length - 1][field].templet).html() || String(columnsMap[columnsMap.length - 1][field].templet)).render(line) + '</div>').find(':input').length === 0 ? $('<div>' + laytpl($(columnsMap[columnsMap.length - 1][field].templet).html() || String(columnsMap[columnsMap.length - 1][field].templet)).render(line) + '</div>').text() : $tableBody.children('tbody').children('tr[data-index=' + bodyIndex + ']').children('td[data-field="' + field + '"]').find(':input').val() || handleNull(line[field])
                : bodyIndex >= 0 && columnsMap[columnsMap.length - 1][field].type === 'numbers' ? bodyIndex + 1 : handleNull(line[field]);
            return {
              v: value,// v 代表单元格的值
              s: {// s 代表样式
                alignment: {
                  horizontal: columnsMap[bodyIndex < -1 ? curIndex - tableStartIndex + 1 : columnsMap.length - 1][field].align ? alignTrans[columnsMap[bodyIndex < -1 ? curIndex - tableStartIndex + 1 : columnsMap.length - 1][field].align] : 'top',
                  vertical: 'center'
                },
                font: {name: family, sz: size, color: {rgb: color}},
                fill: {
                  fgColor: {rgb: bgColor, bgColor: {indexed: 64}}
                },
                border: border
              },
              t: UNHANDLED_VALUES.indexOf(value) === -1 ? cellType : 's'
            };
          }
        }
      }

      excel.exportExcel({
        sheet1: excel.filterExportData(data, showField)
      }, filename, type, {
        extend: {
          '!cols': excel.makeColConfig(widths, 80),
          '!merges': excel.makeMergeConfig(mergeArrays),
          '!rows': excel.makeRowConfig(heightConfig, 16)
        }
      });
      layer.close(loading);

      // 合成 excel.js 识别的 rgb
      function handleRgb(rgb) {
        return rgb ? {rgb: rgb} : rgb
      }

      function numberToLetter(num) {
        var result = [];
        while (num) {
          var t = num % 26;
          if (!t) {
            t = 26;
            --num;
          }
          // Polyfill 兼容旧浏览器
          if (!String.fromCodePoint) (function (stringFromCharCode) {
            var fromCodePoint = function (_) {
              var codeUnits = [], codeLen = 0, result = "";
              for (var index = 0, len = arguments.length; index !== len; ++index) {
                var codePoint = +arguments[index];
                // correctly handles all cases including `NaN`, `-Infinity`, `+Infinity`
                // The surrounding `!(...)` is required to correctly handle `NaN` cases
                // The (codePoint>>>0) === codePoint clause handles decimals and negatives
                if (!(codePoint < 0x10FFFF && (codePoint >>> 0) === codePoint))
                  throw RangeError("Invalid code point: " + codePoint);
                if (codePoint <= 0xFFFF) { // BMP code point
                  codeLen = codeUnits.push(codePoint);
                } else { // Astral code point; split in surrogate halves
                  // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                  codePoint -= 0x10000;
                  codeLen = codeUnits.push(
                      (codePoint >> 10) + 0xD800,  // highSurrogate
                      (codePoint % 0x400) + 0xDC00 // lowSurrogate
                  );
                }
                if (codeLen >= 0x3fff) {
                  result += stringFromCharCode.apply(null, codeUnits);
                  codeUnits.length = 0;
                }
              }
              return result + stringFromCharCode.apply(null, codeUnits);
            };
            try { // IE 8 only supports `Object.defineProperty` on DOM elements
              Object.defineProperty(String, "fromCodePoint", {
                "value": fromCodePoint, "configurable": true, "writable": true
              });
            } catch (e) {
              String.fromCodePoint = fromCodePoint;
            }
          }(String.fromCharCode));
          result.push(String.fromCodePoint(t + 64));
          if (!String.fromCodePoint) (function (stringFromCharCode) {
            var fromCodePoint = function (_) {
              var codeUnits = [], codeLen = 0, result = "";
              for (var index = 0, len = arguments.length; index !== len; ++index) {
                var codePoint = +arguments[index];
                // correctly handles all cases including `NaN`, `-Infinity`, `+Infinity`
                // The surrounding `!(...)` is required to correctly handle `NaN` cases
                // The (codePoint>>>0) === codePoint clause handles decimals and negatives
                if (!(codePoint < 0x10FFFF && (codePoint >>> 0) === codePoint))
                  throw RangeError("Invalid code point: " + codePoint);
                if (codePoint <= 0xFFFF) { // BMP code point
                  codeLen = codeUnits.push(codePoint);
                } else { // Astral code point; split in surrogate halves
                  // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                  codePoint -= 0x10000;
                  codeLen = codeUnits.push(
                      (codePoint >> 10) + 0xD800,  // highSurrogate
                      (codePoint % 0x400) + 0xDC00 // lowSurrogate
                  );
                }
                if (codeLen >= 0x3fff) {
                  result += stringFromCharCode.apply(null, codeUnits);
                  codeUnits.length = 0;
                }
              }
              return result + stringFromCharCode.apply(null, codeUnits);
            };
            try { // IE 8 only supports `Object.defineProperty` on DOM elements
              Object.defineProperty(String, "fromCodePoint", {
                "value": fromCodePoint, "configurable": true, "writable": true
              });
            } catch (e) {
              String.fromCodePoint = fromCodePoint;
            }
          }(String.fromCharCode));
          num = ~~(num / 26);
        }
        return result.reverse().join('');
      }
    },
    startsWith: function (content, str) {
      var reg = new RegExp("^" + str);
      return content && reg.test(content);
    },
    // 深度克隆-不丢失方法
    deepClone: function (obj) {
      var newObj = Array.isArray(obj) ? [] : {}
      if (obj && typeof obj === "object") {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            newObj[key] = (obj && typeof obj[key] === 'object') ? this.deepClone(obj[key]) : obj[key];
          }
        }
      }
      return newObj
    },
    deepStringify: function (obj) {
      var JSON_SERIALIZE_FIX = {
        PREFIX: "[[JSON_FUN_PREFIX_",
        SUFFIX: "_JSON_FUN_SUFFIX]]"
      };
      return JSON.stringify(obj, function (key, value) {
        if (typeof value === 'function') {
          return JSON_SERIALIZE_FIX.PREFIX + value.toString() + JSON_SERIALIZE_FIX.SUFFIX;
        }
        return value;
      });
    },
    /* layui table 中原生的方法 */
    getScrollWidth: function (elem) {
      var width = 0;
      if (elem) {
        width = elem.offsetWidth - elem.clientWidth;
      } else {
        elem = document.createElement('div');
        elem.style.width = '100px';
        elem.style.height = '100px';
        elem.style.overflowY = 'scroll';

        document.body.appendChild(elem);
        width = elem.offsetWidth - elem.clientWidth;
        document.body.removeChild(elem);
      }
      return width;
    }
    , getCompleteCols: function (origin) {
      var cols = this.deepClone(origin);
      var i, j, k, cloneCol;
      for (i = 0; i < cols.length; i++) {
        for (j = 0; j < cols[i].length; j++) {
          if (!cols[i][j].exportHandled) {
            if (cols[i][j].rowspan > 1) {
              cloneCol = this.deepClone(cols[i][j])
              cloneCol.exportHandled = true;
              k = i + 1;
              while (k < cols.length) {
                cols[k].splice(j, 0, cloneCol)
                k++
              }
            }
            if (cols[i][j].colspan > 1) {
              cloneCol = this.deepClone(cols[i][j])
              cloneCol.exportHandled = true;
              for (k = 1; k < cols[i][j].colspan; k++) {
                cols[i].splice(j, 0, cloneCol)
              }
              j = j + parseInt(cols[i][j].colspan) - 1
            }
          }
        }
      }
      return cols[cols.length - 1];
    }
    , parseTempData: function (item3, content, tplData, text) { //表头数据、原始内容、表体数据、是否只返回文本
      var str = item3.templet ? function () {
        return typeof item3.templet === 'function'
            ? item3.templet(tplData)
            : laytpl($(item3.templet).html() || String(content)).render(tplData)
      }() : content;
      return text ? $('<div>' + str + '</div>').text() : str;
    }
    , cache: cache,
  };

  // 输出
  exports('tableFilter', mod);
});
