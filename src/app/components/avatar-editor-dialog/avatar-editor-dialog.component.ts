import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { TranslateModule } from '@ngx-translate/core';

export type AvatarEffect = 'none' | 'grayscale' | 'sepia' | 'warm' | 'cool' | 'contrast';

@Component({
  selector: 'app-avatar-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'avatar.title' | translate }}</h2>
    <mat-dialog-content class="editor">
      <input #fileInput
             type="file"
             accept="image/jpeg,image/png,image/webp"
             class="file-input"
             (change)="onFileSelected($event)">

      @if (!hasImage) {
        <button type="button" class="dropzone" (click)="pickFile()">
          <mat-icon>add_photo_alternate</mat-icon>
          <span class="dropzone-title">{{ 'avatar.choose' | translate }}</span>
          <span class="dropzone-hint">{{ 'avatar.hint' | translate }}</span>
        </button>
      } @else {
        <div class="stage-panel">
          <div class="stage-wrap">
            <canvas #stage
                    class="stage"
                    width="320"
                    height="320"
                    (pointerdown)="onPointerDown($event)"
                    (pointermove)="onPointerMove($event)"
                    (pointerup)="onPointerUp($event)"
                    (pointerleave)="onPointerUp($event)"
                    (pointercancel)="onPointerUp($event)"
                    (wheel)="onWheel($event)"></canvas>
          </div>

          <div class="controls">
            <div class="control-row">
              <button mat-stroked-button type="button" (click)="pickFile()">
                <mat-icon>image</mat-icon>
                {{ 'avatar.replace' | translate }}
              </button>
              <button mat-icon-button type="button" [attr.aria-label]="'avatar.rotateLeft' | translate" (click)="rotate(-90)">
                <mat-icon>rotate_left</mat-icon>
              </button>
              <button mat-icon-button type="button" [attr.aria-label]="'avatar.rotateRight' | translate" (click)="rotate(90)">
                <mat-icon>rotate_right</mat-icon>
              </button>
            </div>

            <label class="slider-label">
              <span>{{ 'avatar.zoom' | translate }}</span>
              <div class="slider-wrap">
                <mat-slider min="1" max="3" step="0.05" discrete>
                  <input matSliderThumb [(ngModel)]="zoom" (ngModelChange)="draw()">
                </mat-slider>
              </div>
            </label>

            <div class="effects">
              <span class="effects-label">{{ 'avatar.effects' | translate }}</span>
              <div class="effect-row">
                @for (effect of effects; track effect.id) {
                  <button type="button"
                          class="effect-btn"
                          [class.active]="selectedEffect === effect.id"
                          (click)="setEffect(effect.id)">
                    {{ effect.labelKey | translate }}
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      @if (errorKey) {
        <p class="error">{{ errorKey | translate }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!hasImage || exporting" (click)="apply()">
        {{ 'avatar.apply' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      max-width: 100%;
      overflow-x: hidden;
    }

    .editor {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      max-height: min(70vh, 640px);
      overflow-x: hidden;
      overflow-y: auto;
      padding-top: 4px;
      box-sizing: border-box;
    }

    .file-input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }

    .dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      min-height: 240px;
      margin: 0;
      padding: 28px 20px;
      border: 1px dashed var(--border-color);
      border-radius: 16px;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: pointer;
      font: inherit;
      text-align: center;
      box-sizing: border-box;
      transition: border-color 0.18s ease, background 0.18s ease;
    }

    .dropzone:hover {
      border-color: var(--accent);
      background: var(--accent-light);
    }

    .dropzone mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--accent);
    }

    .dropzone-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .dropzone-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .stage-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow-x: hidden;
    }

    .stage-wrap {
      display: flex;
      justify-content: center;
      width: 100%;
      max-width: 100%;
      overflow: hidden;
    }

    .stage {
      display: block;
      width: min(100%, 280px);
      max-width: 100%;
      height: auto;
      aspect-ratio: 1;
      border-radius: 50%;
      cursor: grab;
      background: #1c1812;
      touch-action: none;
      box-shadow: inset 0 0 0 1px rgba(245, 215, 107, 0.2);
    }

    .stage:active {
      cursor: grabbing;
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow-x: hidden;
    }

    .control-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      max-width: 100%;
    }

    .slider-label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      box-sizing: border-box;
    }

    .slider-wrap {
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      padding-inline: 2px;
      box-sizing: border-box;
    }

    .slider-label mat-slider {
      width: 100%;
      max-width: 100%;
    }

    .effects-label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .effect-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-width: 100%;
    }

    .effect-btn {
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: var(--bg-primary);
      color: var(--text-secondary);
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 6px 10px;
      cursor: pointer;
    }

    .effect-btn.active {
      border-color: var(--accent);
      background: var(--accent-light);
      color: var(--accent-dark);
    }

    .error {
      margin: 0;
      color: var(--danger);
      font-size: 0.8rem;
    }
  `]
})
export class AvatarEditorDialogComponent implements OnDestroy {
  @ViewChild('stage') stageRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  private readonly dialogRef = inject(MatDialogRef<AvatarEditorDialogComponent, Blob | null>);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);

  readonly effects: { id: AvatarEffect; labelKey: string }[] = [
    { id: 'none', labelKey: 'avatar.effect.none' },
    { id: 'grayscale', labelKey: 'avatar.effect.grayscale' },
    { id: 'sepia', labelKey: 'avatar.effect.sepia' },
    { id: 'warm', labelKey: 'avatar.effect.warm' },
    { id: 'cool', labelKey: 'avatar.effect.cool' },
    { id: 'contrast', labelKey: 'avatar.effect.contrast' }
  ];

  hasImage = false;
  exporting = false;
  errorKey = '';
  zoom = 1;
  selectedEffect: AvatarEffect = 'none';

  private source: HTMLImageElement | null = null;
  private objectUrl: string | null = null;
  private rotation = 0;
  private offsetX = 0;
  private offsetY = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private readonly size = 320;

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  pickFile(): void {
    this.fileInputRef?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.errorKey = 'avatar.invalidType';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorKey = 'avatar.tooLarge';
      return;
    }

    this.errorKey = '';
    this.revokeObjectUrl();
    this.objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      this.source = img;
      this.hasImage = true;
      this.rotation = 0;
      this.zoom = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.selectedEffect = 'none';
      this.cdr.detectChanges();
      afterNextRender(() => {
        this.draw();
      }, { injector: this.injector });
    };
    img.onerror = () => {
      this.errorKey = 'avatar.invalidType';
      this.hasImage = false;
      this.cdr.markForCheck();
    };
    img.src = this.objectUrl;
  }

  rotate(degrees: number): void {
    this.rotation = (this.rotation + degrees + 360) % 360;
    this.draw();
  }

  setEffect(effect: AvatarEffect): void {
    this.selectedEffect = effect;
    this.draw();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.hasImage) {
      return;
    }
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.offsetX += dx;
    this.offsetY += dy;
    this.draw();
  }

  onPointerUp(event: PointerEvent): void {
    this.dragging = false;
    try {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  onWheel(event: WheelEvent): void {
    if (!this.hasImage) {
      return;
    }
    event.preventDefault();
    const next = this.zoom + (event.deltaY < 0 ? 0.08 : -0.08);
    this.zoom = Math.min(3, Math.max(1, Number(next.toFixed(2))));
    this.draw();
  }

  draw(): void {
    const canvas = this.stageRef?.nativeElement;
    if (!canvas || !this.source) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    canvas.width = this.size;
    canvas.height = this.size;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.size / 2, this.size / 2, this.size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.translate(this.size / 2 + this.offsetX, this.size / 2 + this.offsetY);
    ctx.rotate((this.rotation * Math.PI) / 180);

    const base = Math.max(this.size / this.source.width, this.size / this.source.height);
    const scale = base * this.zoom;
    const w = this.source.width * scale;
    const h = this.source.height * scale;
    ctx.filter = this.cssFilter();
    ctx.drawImage(this.source, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.filter = 'none';
  }

  apply(): void {
    const canvas = this.stageRef?.nativeElement;
    if (!canvas || !this.source) {
      return;
    }
    this.exporting = true;
    this.draw();
    canvas.toBlob(blob => {
      this.exporting = false;
      if (!blob) {
        this.errorKey = 'avatar.exportFailed';
        this.cdr.markForCheck();
        return;
      }
      this.dialogRef.close(blob);
    }, 'image/jpeg', 0.92);
  }

  private cssFilter(): string {
    switch (this.selectedEffect) {
      case 'grayscale':
        return 'grayscale(1)';
      case 'sepia':
        return 'sepia(0.85)';
      case 'warm':
        return 'sepia(0.25) saturate(1.2) hue-rotate(-8deg)';
      case 'cool':
        return 'saturate(1.05) hue-rotate(18deg) brightness(1.02)';
      case 'contrast':
        return 'contrast(1.25) saturate(1.1)';
      default:
        return 'none';
    }
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
