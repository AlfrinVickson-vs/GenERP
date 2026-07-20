import { Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PERMISSIONS } from "../common/permissions";
import type { AuthenticatedRequest } from "../common/request-user";
import { AttachmentsService } from "./attachments.service";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";

@Controller("attachments")
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MASTER_DATA_VIEW)
  list(@Req() req: AuthenticatedRequest, @Query("recordType") recordType: string, @Query("recordId") recordId: string) {
    return this.attachments.list(req.user!.companyId, recordType, recordId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MASTER_DATA_EDIT)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAttachmentDto) {
    return this.attachments.create(req.user!.companyId, req.user!.id, dto);
  }

  @Get(":id/download")
  @RequirePermissions(PERMISSIONS.MASTER_DATA_VIEW)
  async download(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Res() response: Response) {
    const { attachment, content } = await this.attachments.download(req.user!.companyId, id);
    response.setHeader("Content-Type", attachment.mimeType);
    response.setHeader("Content-Length", String(content.length));
    response.setHeader("Content-Disposition", `attachment; filename="${attachment.originalName.replace(/"/g, "")}"`);
    response.send(content);
  }
}
