resource "aws_dynamodb_table" "auction" {
  name         = "tf-${var.stage}-auctions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "endingAt"
    type = "S"
  }

  global_secondary_index {
    name            = "statusAndEndDate"
    hash_key        = "status"
    range_key       = "endingAt"
    write_capacity  = 10
    read_capacity   = 10
    projection_type = "ALL"

  }

  tags = {
    Environment = "${var.stage}"
  }
}

output "dynamodb-table-arn" {
  value = aws_dynamodb_table.auction.arn
}

output "dynamodb-table-name" {
  value = aws_dynamodb_table.auction.id
}
