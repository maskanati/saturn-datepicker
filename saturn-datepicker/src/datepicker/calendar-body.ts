/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation,
  NgZone,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { take } from 'rxjs/operators';

/**
 * Extra CSS classes that can be associated with a calendar cell.
 */
export type SatCalendarCellCssClasses = string | string[] | Set<string> | { [key: string]: any };

/**
 * An internal class that represents the data corresponding to a single calendar cell.
 * @docs-private
 */
export class SatCalendarCell {
  constructor(public value: number,
    public displayValue: string,
    public ariaLabel: string,
    public enabled: boolean,
    public cssClasses?: SatCalendarCellCssClasses) { }
}
export class CellChangeDTO {
  constructor(public viewNumber: number,
    public cellValue: number
  ) { }
}


/**
 * An internal component used to display calendar data in a table.
 * @docs-private
 */
@Component({
  moduleId: module.id,
  selector: '[sat-calendar-body]',
  templateUrl: 'calendar-body.html',
  styleUrls: ['calendar-body.css'],
  host: {
    'class': 'mat-calendar-body',
    'role': 'grid',
    'aria-readonly': 'true'
  },
  exportAs: 'matCalendarBody',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SatCalendarBody implements OnChanges {
  /** The label for the table. (e.g. "Jan 2017"). */
  @Input() label: string;

  /** The cells to display in the table. */
  @Input() rows: SatCalendarCell[][];

  /** The value in the table that corresponds to today. */
  @Input() todayValue: number;

  /** The value in the table that is currently selected. */
  @Input() selectedValue: number;

  /** The value in the table since range of dates started.
   * Null means no interval or interval doesn't start in this month
   */
  @Input() begin: number | null;

  /** The value in the table representing end of dates range.
   * Null means no interval or interval doesn't end in this month
   */
  @Input() end: number | null;

  /** Whenever user already selected start of dates interval. */
  @Input() beginSelected: boolean;

  /** Whenever the current month is before the date already selected */
  @Input() isBeforeSelected: boolean;

  /** Whether to mark all dates as semi-selected. */
  @Input() rangeFull: boolean;

  /** Whether to use date range selection behaviour.*/
  @Input() rangeMode = false;

  /** The minimum number of free cells needed to fit the label in the first row. */
  @Input() labelMinRequiredCells: number;

  /** The number of columns in the table. */
  @Input() numCols = 7;

  /** The cell number of the active cell in the table. */
  @Input() activeCell = 0;

  /**
   * The aspect ratio (width / height) to use for the cells in the table. This aspect ratio will be
   * maintained even as the table resizes.
   */
  @Input() cellAspectRatio = 1;
  @Input()
  activeViewCellStatus: CellChangeDTO;
  // (data: CellChangeDTO) {
  //   if (data.viewNumber > this.viewNumber) {
  //     this._cellOver = 32;
  //   } else if (data.viewNumber < this.viewNumber) {
  //     this._cellOver = 0;
  //   }



  // }
  @Input() viewNumber;
  @Input() beginCellSelected

  /** Emits when a new value is selected. */
  @Output() readonly selectedValueChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() readonly mouseOverEvent: EventEmitter<number> = new EventEmitter<number>();

  /** The number of blank cells to put at the beginning for the first row. */
  _firstRowOffset: number;

  /** Padding for the individual date cells. */
  _cellPadding: string;

  /** Width of an individual cell. */
  _cellWidth: string;

  /** The cell number of the hovered cell */
  _cellOver: number;

  constructor(private _elementRef: ElementRef<HTMLElement>, private _ngZone: NgZone) { }

  _cellClicked(cell: SatCalendarCell): void {
    if (cell.enabled) {
      this.selectedValueChange.emit(cell.value);
    }
  }

  _mouseOverCell(cell: SatCalendarCell): void {
    this._cellOver = cell.value;

    this.mouseOverEvent.emit(cell.value);
  }

  ngOnChanges(changes: SimpleChanges) {
    const columnChanges = changes['numCols'];
    const { rows, numCols } = this;

    if (changes['rows'] || columnChanges) {
      this._firstRowOffset = rows && rows.length && rows[0].length ? numCols - rows[0].length : 0;
    }

    if (changes['cellAspectRatio'] || columnChanges || !this._cellPadding) {
      this._cellPadding = `${50 * this.cellAspectRatio / numCols}%`;
    }

    if (columnChanges || !this._cellWidth) {
      this._cellWidth = `${100 / numCols}%`;
    }

    if (changes.activeCell) {
      this._cellOver = this.activeCell + 1;
    }
  }

  _isActiveCell(rowIndex: number, colIndex: number): boolean {
    let cellNumber = rowIndex * this.numCols + colIndex;

    // Account for the fact that the first row may not have as many cells.
    if (rowIndex) {
      cellNumber -= this._firstRowOffset;
    }

    return cellNumber === this.activeCell;
  }

  /** Whenever to mark cell as semi-selected (inside dates interval). */
  _isSemiSelected(date: number) {
    if (!this.rangeMode) {
      return false;
    }
    if (this.rangeFull) {
      return true;
    }
    /** Do not mark start and end of interval. */
    if (date === this.begin || date === this.end) {
      return false;
    }
    if (this.begin && !this.end) {
      return date > this.begin;
    }
    if (this.end && !this.begin) {
      return date < this.end;
    }
    return date > <number>this.begin && date < <number>this.end;
  }

  /** Whenever to mark cell as semi-selected before the second date is selected (between the begin cell and the hovered cell). */
  _isBetweenOverAndBegin(date: number): boolean {
    if (!this.rangeMode || !this.beginSelected) {
      return false;
    }
    if (this.viewNumber == this.activeViewCellStatus.viewNumber && this._cellOver && this.isBeforeSelected && !this.begin) {
      return date > this._cellOver;
    }
    if (this.viewNumber == this.activeViewCellStatus.viewNumber && this._cellOver > this.begin) {
      return date > this.begin && date < this._cellOver;
    }
    if (this.viewNumber == this.activeViewCellStatus.viewNumber && this._cellOver && this._cellOver < this.begin) {
      return date < this.begin && date > this._cellOver;
    }
    if (this.beginCellSelected) {
      if (this.viewNumber < this.activeViewCellStatus.viewNumber && this.viewNumber > this.beginCellSelected.viewNumber) {
        return true;
      }

      if (this.viewNumber > this.activeViewCellStatus.viewNumber && this.viewNumber < this.beginCellSelected.viewNumber) {
        return true;
      }

      if (this.viewNumber === this.beginCellSelected.viewNumber && this.viewNumber < this.activeViewCellStatus.viewNumber) {
        return date > this.beginCellSelected.cellValue;
      }

      if (this.viewNumber === this.beginCellSelected.viewNumber && this.viewNumber > this.activeViewCellStatus.viewNumber) {
        return date < this.beginCellSelected.cellValue;
      }
    }
    return false;
  }

  /** Whenever to mark cell as begin of the range. */
  _isBegin(date: number): boolean {
    if (this.rangeMode && this.beginSelected && this._cellOver) {
      if (this.isBeforeSelected && !this.begin) {
        if(this._cellOver === date && this.viewNumber==this.activeViewCellStatus.viewNumber)
console.log(1,this.viewNumber,date)
return this._cellOver === date && this.viewNumber==this.activeViewCellStatus.viewNumber;
      } else {
        if((this.begin === date && !(this._cellOver < this.begin) && this.viewNumber===this.beginCellSelected.viewNumber && this.beginCellSelected.viewNumber>=this.viewNumber) ||
        (this._cellOver === date && this._cellOver < this.begin && this.viewNumber===this.activeViewCellStatus.viewNumber))
console.log(2,this.viewNumber,date)
return (this.begin === date && !(this._cellOver < this.begin) && this.viewNumber===this.beginCellSelected.viewNumber && this.activeViewCellStatus.viewNumber>=this.viewNumber) ||
          (this._cellOver === date && this._cellOver < this.begin && this.viewNumber===this.activeViewCellStatus.viewNumber)
      }
    }
    if(this.begin === date)
console.log(3,this.viewNumber,date)
    return this.begin === date
  }

  /** Whenever to mark cell as end of the range. */
  _isEnd(date: number): boolean {
    if (this.rangeMode && this.beginSelected && this._cellOver) {
      if (this.isBeforeSelected && !this.begin) {
        return false;
      } else if(this.viewNumber===this.activeViewCellStatus.viewNumber) {
        return (this.end === date && !(this._cellOver > this.begin)) ||
          (this._cellOver === date && this._cellOver > this.begin)
      }else{
        return this.begin==date && this.viewNumber===this.beginCellSelected.viewNumber && this.viewNumber>this.activeViewCellStatus.viewNumber
      }
    }
    return this.end === date;
  }

  /** Focuses the active cell after the microtask queue is empty. */
  _focusActiveCell() {
    this._ngZone.runOutsideAngular(() => {
      this._ngZone.onStable.asObservable().pipe(take(1)).subscribe(() => {
        const activeCell: HTMLElement | null =
          this._elementRef.nativeElement.querySelector('.mat-calendar-body-active');

        if (activeCell) {
          activeCell.focus();
        }
      });
    });
  }

  /** Whenever to highlight the target cell when selecting the second date in range mode */
  _previewCellOver(date: number): boolean {
    return this._cellOver === date && this.rangeMode && this.beginSelected && this.viewNumber == this.activeViewCellStatus.viewNumber;
  }
}
