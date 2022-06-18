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
    hash_key           = "status"
    name               = "statusAndEndDate"
    non_key_attributes = ["status", "endingAt"]
    projection_type    = "ALL"
    range_key          = "endingAt"
    read_capacity      = 10
    write_capacity     = 10

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
